import Foundation

/// The audio recorder omits paused intervals; step timestamps use the same active timeline.
struct RecordingTimeline {
    let startedAt: Date
    private var pausedAt: Date?
    private var pausedDuration: TimeInterval = 0

    init(startedAt: Date) { self.startedAt = startedAt }

    func elapsed(at date: Date) -> TimeInterval {
        max(0, (pausedAt ?? date).timeIntervalSince(startedAt) - pausedDuration)
    }

    mutating func pause(at date: Date) {
        guard pausedAt == nil else { return }
        pausedAt = date
    }

    mutating func resume(at date: Date) {
        guard let pausedAt else { return }
        pausedDuration += max(0, date.timeIntervalSince(pausedAt))
        self.pausedAt = nil
    }
}
