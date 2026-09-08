import Foundation
import CryptoKit
import Security
import AppKit

struct DesktopConnectionChallenge {
    let verifier: String
    var codeChallenge: String {
        SHA256.hash(data: Data(verifier.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    init() throws {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw ConnectionError.message("Unable to prepare a secure connection. Please try again.")
        }
        verifier = bytes.map { String(format: "%02x", $0) }.joined()
    }
}

enum ConnectionError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let text) = self { return text }; return nil }
}

@MainActor
final class DesktopConnection: ObservableObject {
    @Published private(set) var waiting = false
    @Published private(set) var error: String?
    private var task: Task<Void, Never>?
    private var activeAttempt: UUID?

    func cancel() {
        task?.cancel()
        task = nil
        activeAttempt = nil
        waiting = false
    }

    func connect() {
        guard !waiting else { return }
        waiting = true
        error = nil
        let attempt = UUID()
        activeAttempt = attempt
        task = Task {
            defer { if activeAttempt == attempt { waiting = false } }
            do {
                let challenge = try DesktopConnectionChallenge()
                let base = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
                guard let baseURL = URL(string: base), ["https", "http"].contains(baseURL.scheme) else {
                    throw ConnectionError.message("Check the workspace address in Settings.")
                }
                let (data, response) = try await post(baseURL.appendingPathComponent("api/desktop/connect"), body: ["codeChallenge": challenge.codeChallenge])
                guard response.statusCode == 200 || response.statusCode == 201,
                      let info = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let id = info["id"] as? String,
                      let connectURLString = info["connectUrl"] as? String,
                      let connectURL = URL(string: connectURLString),
                      connectURL.scheme == baseURL.scheme, connectURL.host == baseURL.host, connectURL.port == baseURL.port else {
                    throw ConnectionError.message("Could not start the connection. Please try again.")
                }
                try Task.checkCancellation()
                guard NSWorkspace.shared.open(connectURL) else {
                    throw ConnectionError.message("Your browser could not open. Please try again.")
                }
                let deadline = Date().addingTimeInterval(300)
                while Date() < deadline {
                    try await Task.sleep(for: .seconds(2))
                    let (data, response) = try await post(baseURL.appendingPathComponent("api/desktop/connect/\(id)"), body: ["verifier": challenge.verifier])
                    try Task.checkCancellation()
                    if response.statusCode == 202 { continue }
                    if response.statusCode == 410 { break }
                    guard response.statusCode == 200,
                          let result = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let token = result["token"] as? String, !token.isEmpty else {
                        throw ConnectionError.message("The connection could not be completed. Please try again.")
                    }
                    guard (UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com") == base else {
                        throw ConnectionError.message("The workspace changed. Connect again to use the new workspace.")
                    }
                    UserDefaults.standard.set(token, forKey: "apiToken")
                    return
                }
                throw ConnectionError.message("This connection expired. Select Connect to try again.")
            } catch is CancellationError {
                // The connection can be started again without changing the existing account.
            } catch {
                if !Task.isCancelled { self.error = error.localizedDescription }
            }
        }
    }

    private func post(_ url: URL, body: [String: String]) async throws -> (Data, HTTPURLResponse) {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse else {
            throw ConnectionError.message("The workspace did not respond. Please try again.")
        }
        return (data, response)
    }
}
