import XCTest
@testable import VibeTuto

final class CapturePersistenceTests: XCTestCase {
    func testPauseIsExcludedFromAudioAndStepTimeline() {
        let start = Date(timeIntervalSince1970: 0)
        var timeline = RecordingTimeline(startedAt: start)
        timeline.pause(at: start.addingTimeInterval(5))
        XCTAssertEqual(timeline.elapsed(at: start.addingTimeInterval(30)), 5)
        timeline.resume(at: start.addingTimeInterval(35))
        XCTAssertEqual(timeline.elapsed(at: start.addingTimeInterval(40)), 10)
        XCTAssertEqual(timeline.startedAt, start)
    }

    func testRegionClickIsRelativeToSavedImage() {
        let point = CaptureCoordinates.imagePoint(x: 0.5, y: 0.5, screenSize: CGSize(width: 1000, height: 800), region: CGRect(x: 400, y: 200, width: 400, height: 400))
        XCTAssertEqual(point, CGPoint(x: 0.25, y: 0.5))
        XCTAssertNil(CaptureCoordinates.imagePoint(x: 0.1, y: 0.1, screenSize: CGSize(width: 1000, height: 800), region: CGRect(x: 400, y: 200, width: 400, height: 400)))
    }

    func testFullScreenClickRemainsNormalized() {
        XCTAssertEqual(CaptureCoordinates.imagePoint(x: 0.4, y: 0.7, screenSize: CGSize(width: 1920, height: 1080), region: nil), CGPoint(x: 0.4, y: 0.7))
        XCTAssertNil(CaptureCoordinates.imagePoint(x: nil, y: nil, screenSize: .zero, region: nil))
    }

    func testSavedRecordingSurvivesNewStoreIncludingAudioAndImages() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let audio = directory.appendingPathComponent("input.m4a")
        try Data([1, 2, 3]).write(to: audio)
        let recordings = directory.appendingPathComponent("recordings")
        let store = LocalStore(directory: recordings)
        let session = RecordingSession(id: UUID(), startedAt: Date(timeIntervalSince1970: 10), duration: 15, macosVersion: "test", screenResolution: "100x100", appsUsed: [], steps: [], audioKey: "narration.m4a")
        let saved = try store.saveSession(session, screenshots: ["nested/step.jpg": Data([4, 5])], audioFile: audio)
        let restoredStore = LocalStore(directory: recordings)
        XCTAssertEqual(restoredStore.pendingSessions().map { $0.resolvingSymlinksInPath() }, [saved.resolvingSymlinksInPath()])
        XCTAssertEqual(try restoredStore.loadSession(at: saved).id, session.id)
        XCTAssertEqual(try Data(contentsOf: saved.appendingPathComponent("narration.m4a")), Data([1, 2, 3]))
        XCTAssertEqual(try Data(contentsOf: saved.appendingPathComponent("nested/step.jpg")), Data([4, 5]))
        try restoredStore.removeSession(at: saved)
        XCTAssertTrue(restoredStore.pendingSessions().isEmpty)
    }
}
