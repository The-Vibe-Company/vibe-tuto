import Foundation

/// Current state of the recording session.
enum RecordingState: Sendable, Equatable {
    case idle
    case selectingRegion
    case countdown(remaining: Int)
    case recording
    case paused
    case stopping
    case uploading(progress: Double)
    case completed
    case error(String)
}
