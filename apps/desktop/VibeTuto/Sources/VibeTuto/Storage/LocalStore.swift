import Foundation

/// Manages local persistence of recording sessions for offline support and retry logic.
/// Uses file-system based storage (JSON + image files) for simplicity in MVP.
final class LocalStore: @unchecked Sendable {
    private let storageDirectory: URL
    private let fileManager = FileManager.default

    init(directory: URL? = nil) {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        storageDirectory = directory ?? appSupport.appendingPathComponent("VibeTuto/recordings", isDirectory: true)
        try? fileManager.createDirectory(at: storageDirectory, withIntermediateDirectories: true)
    }

    /// Save a recording session locally for later upload.
    func saveSession(_ session: RecordingSession, screenshots: [String: Data], audioFile: URL? = nil) throws -> URL {
        let sessionDir = storageDirectory.appendingPathComponent(session.id.uuidString, isDirectory: true)
        try fileManager.createDirectory(at: sessionDir, withIntermediateDirectories: true)

        // Save metadata
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let metadataData = try encoder.encode(session)
        try metadataData.write(to: sessionDir.appendingPathComponent("session.json"), options: .atomic)

        // Save screenshots (keys may contain '/' so create parent dirs)
        for (key, data) in screenshots {
            let fileURL = sessionDir.appendingPathComponent(key)
            let parentDir = fileURL.deletingLastPathComponent()
            try fileManager.createDirectory(at: parentDir, withIntermediateDirectories: true)
            try data.write(to: fileURL)
        }

        if let audioFile {
            let destination = sessionDir.appendingPathComponent("narration.m4a")
            if audioFile != destination {
                try Data(contentsOf: audioFile).write(to: destination, options: .atomic)
            }
        }
        return sessionDir
    }

    /// List all locally saved sessions that haven't been uploaded.
    func pendingSessions() -> [URL] {
        guard let contents = try? fileManager.contentsOfDirectory(
            at: storageDirectory,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: .skipsHiddenFiles
        ) else {
            return []
        }

        return contents.filter { url in
            var isDir: ObjCBool = false
            fileManager.fileExists(atPath: url.path, isDirectory: &isDir)
            return isDir.boolValue
        }
    }

    /// Load a session from local storage.
    func loadSession(at directory: URL) throws -> RecordingSession {
        let metadataURL = directory.appendingPathComponent("session.json")
        let data = try Data(contentsOf: metadataURL)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(RecordingSession.self, from: data)
    }

    /// Remove a session after successful upload.
    func removeSession(at directory: URL) throws {
        try fileManager.removeItem(at: directory)
    }

    /// Get the total storage used by pending sessions.
    func storageUsed() -> Int64 {
        let sessions = pendingSessions()
        var total: Int64 = 0

        for sessionDir in sessions {
            if let enumerator = fileManager.enumerator(at: sessionDir, includingPropertiesForKeys: [.fileSizeKey]) {
                while let fileURL = enumerator.nextObject() as? URL {
                    if let size = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                        total += Int64(size)
                    }
                }
            }
        }

        return total
    }
}
