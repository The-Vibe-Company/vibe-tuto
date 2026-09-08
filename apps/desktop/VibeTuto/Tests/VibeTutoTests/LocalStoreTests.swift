import XCTest
@testable import VibeTuto

final class LocalStoreTests: XCTestCase {
    private var tempDirectory: URL!

    override func setUpWithError() throws {
        tempDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent("VibeTutoTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: tempDirectory, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: tempDirectory)
    }

    func testSavesAndLoadsSessionWithScreenshotAndAudio() throws {
        let store = LocalStore(storageDirectory: tempDirectory)
        let sessionID = UUID()
        let step = DetectedStep(
            orderIndex: 0,
            timestamp: 1,
            actionType: .click,
            screenshotKey: "\(sessionID.uuidString)/step-0.jpg",
            clickX: 0.5,
            clickY: 0.5,
            viewportWidth: 1000,
            viewportHeight: 600,
            appBundleID: "com.apple.Safari",
            appName: "Safari",
            windowTitle: "Example",
            url: "https://example.com",
            elementInfo: nil,
            autoCaption: "Click"
        )
        let session = RecordingSession(
            id: sessionID,
            startedAt: Date(),
            duration: 3,
            macosVersion: "15.0",
            screenResolution: "1000x600",
            appsUsed: ["com.apple.Safari"],
            steps: [step],
            audioKey: "narration.m4a"
        )
        let audioURL = tempDirectory.appendingPathComponent("source.m4a")
        try Data([7, 8, 9]).write(to: audioURL)

        let directory = try store.saveSession(
            session,
            screenshots: [step.screenshotKey: Data([1, 2, 3])],
            audioFile: audioURL
        )

        let loaded = try store.loadSession(at: directory)
        XCTAssertEqual(loaded.id, sessionID)
        XCTAssertEqual(store.screenshotFiles(for: loaded, at: directory)[step.screenshotKey]?.lastPathComponent, "step-0.jpg")
        XCTAssertEqual(try Data(contentsOf: store.audioFile(for: loaded, at: directory)!), Data([7, 8, 9]))
    }
}
