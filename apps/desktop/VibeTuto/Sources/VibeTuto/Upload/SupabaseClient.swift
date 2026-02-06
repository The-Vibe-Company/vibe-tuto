import Foundation
import os

private let logger = Logger(subsystem: "com.vibetuto.recorder", category: "SupabaseClient")

/// Client for communicating with the CapTuto web platform (Supabase REST + Storage).
final class SupabaseClient: @unchecked Sendable {
    private let baseURL: URL
    private let apiKey: String
    private var accessToken: String?
    private let session: URLSession

    init(baseURL: URL, apiKey: String) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.session = URLSession(configuration: .default)

        // Load stored token
        if let storedToken = UserDefaults.standard.string(forKey: "apiToken"), !storedToken.isEmpty {
            self.accessToken = storedToken
        }
    }

    // MARK: - Authentication

    /// Set the access token directly (from stored preferences).
    func setAccessToken(_ token: String) {
        self.accessToken = token
    }

    /// Load the token from UserDefaults.
    func loadStoredToken() -> Bool {
        if let token = UserDefaults.standard.string(forKey: "apiToken"), !token.isEmpty {
            self.accessToken = token
            return true
        }
        return false
    }

    /// Whether the client has a valid token.
    var isAuthenticated: Bool {
        accessToken != nil && !(accessToken?.isEmpty ?? true)
    }

    // MARK: - Upload

    /// Create a recording on the web platform by POSTing metadata + steps.
    /// Screenshots are embedded as base64 in the payload; the server handles Storage upload.
    func createRecording(payload: RecordingPayload) async throws -> String {
        guard let token = accessToken else { throw UploadError.notAuthenticated }

        let url = baseURL.appendingPathComponent("api/recordings")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(payload)

        logger.info("Creating recording at: \(url.absoluteString)")
        if let jsonString = String(data: request.httpBody ?? Data(), encoding: .utf8) {
            logger.info("Payload: \(String(jsonString.prefix(500)))")
        }

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw UploadError.recordingCreationFailed
        }
        logger.info("Create recording response: \(httpResponse.statusCode)")
        if !(200...299).contains(httpResponse.statusCode) {
            let body = String(data: data, encoding: .utf8) ?? "no body"
            logger.error("Create recording error: \(body)")
            throw UploadError.recordingCreationFailed
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let tutorialID = (json["tutorialId"] as? String) ?? (json["tutorial_id"] as? String) else {
            throw UploadError.recordingCreationFailed
        }

        return tutorialID
    }
}

// MARK: - Errors

enum UploadError: LocalizedError {
    case notAuthenticated
    case authenticationFailed
    case uploadFailed(String)
    case recordingCreationFailed

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "Not authenticated. Please sign in."
        case .authenticationFailed: return "Authentication failed. Check credentials."
        case .uploadFailed(let key): return "Failed to upload: \(key)"
        case .recordingCreationFailed: return "Failed to create recording on server."
        }
    }
}
