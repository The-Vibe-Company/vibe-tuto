import Foundation
import os

private let logger = Logger(subsystem: "com.vibetuto.recorder", category: "UploadManager")

/// Orchestrates the upload of recording data (screenshots, metadata, audio) to the web platform.
final class UploadManager: @unchecked Sendable {
    private let supabaseClient: SupabaseClient

    var onProgress: ((Double) -> Void)?

    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
    }

    /// Upload a complete recording session to the web platform.
    /// Screenshots are embedded as base64 in the JSON payload.
    func uploadSession(
        steps: [DetectedStep],
        screenshotFiles: [String: URL],
        audioFile: URL?,
        metadata: RecordingMetadata
    ) async throws -> String {
        onProgress?(0.1)

        // Build upload steps, encoding screenshots one at a time to avoid
        // loading all base64 strings into memory simultaneously.
        var uploadSteps: [UploadStep] = []
        uploadSteps.reserveCapacity(steps.count)
        for step in steps {
            var base64Data: String? = nil
            if let fileURL = screenshotFiles[step.screenshotKey],
               let data = try? Data(contentsOf: fileURL) {
                base64Data = data.base64EncodedString()
            }
            uploadSteps.append(UploadStep(step: step, screenshotData: base64Data))
        }

        logger.info("Uploading \(uploadSteps.count) steps (\(uploadSteps.filter { $0.screenshotData != nil }.count) with screenshots)")

        onProgress?(0.3)

        // If audio was recorded, read the file so we can set the key.
        // The actual audio data is not embedded in JSON — it's uploaded separately
        // or handled by the web API via the audio_key reference.
        let audioKey: String? = audioFile != nil ? "narration.m4a" : nil

        // Single API call with everything embedded
        let payload = RecordingPayload(
            recording: metadata,
            steps: uploadSteps,
            audioKey: audioKey
        )

        onProgress?(0.5)

        let tutorialID = try await supabaseClient.createRecording(payload: payload)

        onProgress?(1.0)

        return tutorialID
    }
}
