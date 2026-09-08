import Foundation
import os

private let logger = Logger(subsystem: "com.vibetuto.recorder", category: "UploadManager")

/// Uploads one screenshot per idempotent request, then narration.
final class UploadManager: @unchecked Sendable {
    private let supabaseClient: SupabaseClient
    var onProgress: ((Double) -> Void)?

    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
    }

    func uploadSession(
        steps: [DetectedStep],
        screenshotFiles: [String: URL],
        audioFile: URL?,
        metadata: RecordingMetadata,
        existingTutorialID: String? = nil,
        onCreated: ((String) throws -> Void)? = nil
    ) async throws -> String {
        guard !steps.isEmpty else { throw UploadError.uploadFailed("No captured steps") }
        var tutorialID = existingTutorialID
        let totalUnits = steps.count + (audioFile == nil ? 0 : 1)
        for (index, step) in steps.enumerated() {
            guard let file = screenshotFiles[step.screenshotKey] else {
                throw UploadError.uploadFailed("Missing screenshot for step \(index + 1)")
            }
            let encoded = try Data(contentsOf: file).base64EncodedString()
            let payload = RecordingPayload(
                recording: metadata,
                steps: [UploadStep(step: step, screenshotData: encoded)],
                audioKey: nil
            )
            let returnedID = try await supabaseClient.createRecording(payload: payload)
            if let tutorialID, tutorialID != returnedID {
                throw UploadError.recordingCreationFailed
            }
            if tutorialID == nil {
                tutorialID = returnedID
                try onCreated?(returnedID)
            }
            logger.info("Uploaded capture \(index + 1) of \(steps.count)")
            onProgress?(Double(index + 1) / Double(totalUnits))
        }
        guard let tutorialID else { throw UploadError.recordingCreationFailed }
        if let audioFile {
            try await supabaseClient.uploadAudio(tutorialID: tutorialID, file: audioFile)
            onProgress?(1)
        }
        onProgress?(1)
        return tutorialID
    }
}
