package com.snoringdemo.pcm

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min

class RNPCMConverterModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RNPCMConverter"

  @ReactMethod
  fun convertToPCM(inputPath: String, outputPath: String, promise: Promise) {
    try {
      val inputFile = File(inputPath)
      if (!inputFile.exists()) {
        promise.reject("input_missing", "Input file does not exist: $inputPath")
        return
      }

      val outputFile = File(outputPath)
      outputFile.parentFile?.mkdirs()

      val raw = decodeToMonoFloat(inputPath)
      val resampled = resampleLinear(raw.samples, raw.sampleRate, TARGET_SAMPLE_RATE)

      FileOutputStream(outputFile).use { stream ->
        val byteBuffer = ByteBuffer.allocate(resampled.size * 4).order(ByteOrder.LITTLE_ENDIAN)
        for (sample in resampled) {
          byteBuffer.putFloat(sample)
        }
        stream.write(byteBuffer.array())
      }

      promise.resolve(outputFile.absolutePath)
    } catch (error: Exception) {
      promise.reject("pcm_convert_failed", error.message, error)
    }
  }

  private fun decodeToMonoFloat(path: String): DecodedAudio {
    val extractor = MediaExtractor()
    extractor.setDataSource(path)

    var trackIndex = -1
    var mediaFormat: MediaFormat? = null

    for (index in 0 until extractor.trackCount) {
      val format = extractor.getTrackFormat(index)
      val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
      if (mime.startsWith("audio/")) {
        trackIndex = index
        mediaFormat = format
        break
      }
    }

    if (trackIndex == -1 || mediaFormat == null) {
      extractor.release()
      throw IllegalArgumentException("No audio track found")
    }

    extractor.selectTrack(trackIndex)

    val mimeType = mediaFormat.getString(MediaFormat.KEY_MIME)
      ?: throw IllegalArgumentException("Missing MIME type")
    val sampleRate = mediaFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
    val channelCount = mediaFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)

    val codec = MediaCodec.createDecoderByType(mimeType)
    codec.configure(mediaFormat, null, null, 0)
    codec.start()

    val bufferInfo = MediaCodec.BufferInfo()
    val outputFloats = ArrayList<Float>(sampleRate * 30)

    var inputDone = false
    var outputDone = false

    while (!outputDone) {
      if (!inputDone) {
        val inputBufferIndex = codec.dequeueInputBuffer(TIMEOUT_US)
        if (inputBufferIndex >= 0) {
          val inputBuffer = codec.getInputBuffer(inputBufferIndex)
          val sampleSize = extractor.readSampleData(inputBuffer!!, 0)

          if (sampleSize < 0) {
            codec.queueInputBuffer(
              inputBufferIndex,
              0,
              0,
              0,
              MediaCodec.BUFFER_FLAG_END_OF_STREAM,
            )
            inputDone = true
          } else {
            val presentationTimeUs = extractor.sampleTime
            codec.queueInputBuffer(inputBufferIndex, 0, sampleSize, presentationTimeUs, 0)
            extractor.advance()
          }
        }
      }

      val outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
      when {
        outputBufferIndex >= 0 -> {
          val outputBuffer = codec.getOutputBuffer(outputBufferIndex)
          if (outputBuffer != null && bufferInfo.size > 0) {
            outputBuffer.position(bufferInfo.offset)
            outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
            appendPcm16AsMonoFloat(outputBuffer, channelCount, outputFloats)
          }

          codec.releaseOutputBuffer(outputBufferIndex, false)
          if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
            outputDone = true
          }
        }
        outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
          // Decoder output format can change dynamically; channel count can be read here if needed.
        }
      }
    }

    codec.stop()
    codec.release()
    extractor.release()

    return DecodedAudio(outputFloats.toFloatArray(), sampleRate)
  }

  private fun appendPcm16AsMonoFloat(
    pcmBuffer: ByteBuffer,
    channelCount: Int,
    out: MutableList<Float>,
  ) {
    pcmBuffer.order(ByteOrder.LITTLE_ENDIAN)
    val shortCount = pcmBuffer.remaining() / 2
    if (shortCount <= 0 || channelCount <= 0) {
      return
    }

    val frameCount = shortCount / channelCount
    for (frame in 0 until frameCount) {
      var mono = 0f
      for (channel in 0 until channelCount) {
        val value = pcmBuffer.short.toFloat() / 32768f
        mono += value
      }
      out.add((mono / channelCount).coerceIn(-1f, 1f))
    }
  }

  private fun resampleLinear(
    input: FloatArray,
    inputRate: Int,
    outputRate: Int,
  ): FloatArray {
    if (input.isEmpty()) {
      return FloatArray(0)
    }

    if (inputRate == outputRate) {
      return input
    }

    val ratio = outputRate.toDouble() / inputRate.toDouble()
    val outputLength = max(1, (input.size * ratio).toInt())
    val output = FloatArray(outputLength)

    for (i in 0 until outputLength) {
      val sourcePosition = i / ratio
      val leftIndex = sourcePosition.toInt()
      val rightIndex = min(leftIndex + 1, input.size - 1)
      val fraction = (sourcePosition - leftIndex).toFloat()
      output[i] = input[leftIndex] + (input[rightIndex] - input[leftIndex]) * fraction
    }

    return output
  }

  private data class DecodedAudio(
    val samples: FloatArray,
    val sampleRate: Int,
  )

  companion object {
    private const val TIMEOUT_US = 10_000L
    private const val TARGET_SAMPLE_RATE = 16_000
  }
}
