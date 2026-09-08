import XCTest
import CryptoKit
@testable import VibeTuto

private final class AudioProtocol: URLProtocol {
    static var requestObserver: ((URLRequest) -> Void)?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.requestObserver?(request)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data("{\"success\":true,\"tutorialId\":\"tutorial-fixture\"}".utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

final class AudioUploadTests: XCTestCase {
    func testConnectionChallengeIsRandomAndHashesVerifierExactly() throws {
        let first = try DesktopConnectionChallenge()
        let second = try DesktopConnectionChallenge()
        XCTAssertEqual(first.verifier.count, 64)
        XCTAssertNotEqual(first.verifier, second.verifier)
        XCTAssertEqual(first.codeChallenge, SHA256.hash(data: Data(first.verifier.utf8)).map { String(format: "%02x", $0) }.joined())
    }

    func testRetrySendsEveryScreenshotAsAnIndividualRequest() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [AudioProtocol.self]
        let network = URLSession(configuration: configuration)
        defer { network.invalidateAndCancel(); AudioProtocol.requestObserver = nil }
        let client = SupabaseClient(baseURL: URL(string: "https://fixture.invalid")!, apiKey: "", session: network)
        client.setAccessToken("fixture-token")
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try Data([1, 2, 3]).write(to: file)
        defer { try? FileManager.default.removeItem(at: file) }
        let steps = [0, 1].map { index in
            DetectedStep(orderIndex: index, timestamp: Double(index), actionType: .click, screenshotKey: "step-\(index)", clickX: 0.5, clickY: 0.5, viewportWidth: 100, viewportHeight: 100, appBundleID: nil, appName: nil, windowTitle: nil, url: nil, elementInfo: nil, autoCaption: "Click")
        }
        let observed = expectation(description: "both existing recording screenshots retried")
        observed.expectedFulfillmentCount = 2
        AudioProtocol.requestObserver = { request in
            XCTAssertEqual(request.url?.path, "/api/recordings")
            observed.fulfill()
        }
        let uploader = UploadManager(supabaseClient: client)
        let metadata = RecordingMetadata(clientID: "fixture-client", duration: 2, startedAt: "test", macosVersion: "test", screenResolution: "100x100", appsUsed: [])
        let id = try await uploader.uploadSession(steps: steps, screenshotFiles: ["step-0": file, "step-1": file], audioFile: nil, metadata: metadata, existingTutorialID: "tutorial-fixture", onCreated: { _ in XCTFail("Retry must retain the existing ID") })
        XCTAssertEqual(id, "tutorial-fixture")
        await fulfillment(of: [observed], timeout: 1)
    }

    func testAudioUploadUsesRecordingResourceAndBearerToken() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [AudioProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel(); AudioProtocol.requestObserver = nil }
        let client = SupabaseClient(baseURL: URL(string: "https://fixture.invalid")!, apiKey: "", session: session)
        client.setAccessToken("fixture-token")
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".m4a")
        try Data("audio-fixture".utf8).write(to: file)
        defer { try? FileManager.default.removeItem(at: file) }
        let observed = expectation(description: "multipart audio request")
        AudioProtocol.requestObserver = { request in
            XCTAssertEqual(request.url?.path, "/api/recordings/tutorial-fixture/audio")
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer fixture-token")
            XCTAssertTrue(request.value(forHTTPHeaderField: "Content-Type")?.hasPrefix("multipart/form-data; boundary=Captuto-") == true)
            var body = request.httpBody ?? Data()
            if let stream = request.httpBodyStream {
                stream.open()
                defer { stream.close() }
                var buffer = [UInt8](repeating: 0, count: 1024)
                while stream.hasBytesAvailable {
                    let count = stream.read(&buffer, maxLength: buffer.count)
                    if count <= 0 { break }
                    body.append(contentsOf: buffer.prefix(count))
                }
            }
            let text = String(decoding: body, as: UTF8.self)
            XCTAssertTrue(text.contains("name=\"file\"; filename=\"narration.m4a\""))
            XCTAssertTrue(text.contains("audio-fixture"))
            observed.fulfill()
        }
        try await client.uploadAudio(tutorialID: "tutorial-fixture", file: file)
        await fulfillment(of: [observed], timeout: 1)
    }
}
