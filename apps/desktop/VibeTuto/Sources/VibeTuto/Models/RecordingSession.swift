import Foundation

/// Complete recording session data for upload.
struct RecordingSession: Codable, Sendable {
    let id: UUID
    let startedAt: Date
    let duration: TimeInterval
    let macosVersion: String
    let screenResolution: String
    let appsUsed: [String]
    let steps: [DetectedStep]
    let audioKey: String?

    enum CodingKeys: String, CodingKey {
        case id
        case startedAt = "started_at"
        case duration
        case macosVersion = "macos_version"
        case screenResolution = "screen_resolution"
        case appsUsed = "apps_used"
        case steps
        case audioKey = "audio_key"
    }
}

/// A step with embedded base64 screenshot data for upload.
struct UploadStep: Codable, Sendable {
    let orderIndex: Int
    let timestamp: TimeInterval
    let actionType: ActionType
    let screenshotKey: String
    let screenshotData: String?  // base64-encoded JPEG
    let clickX: CGFloat?
    let clickY: CGFloat?
    let viewportWidth: Int
    let viewportHeight: Int
    let appBundleID: String?
    let appName: String?
    let windowTitle: String?
    let url: String?
    let elementInfo: ElementInfo?
    let autoCaption: String

    enum CodingKeys: String, CodingKey {
        case orderIndex = "order_index"
        case timestamp
        case actionType = "action_type"
        case screenshotKey = "screenshot_key"
        case screenshotData = "screenshot_data"
        case clickX = "click_x"
        case clickY = "click_y"
        case viewportWidth = "viewport_width"
        case viewportHeight = "viewport_height"
        case appBundleID = "app_bundle_id"
        case appName = "app_name"
        case windowTitle = "window_title"
        case url
        case elementInfo = "element_info"
        case autoCaption = "auto_caption"
    }

    init(step: DetectedStep, screenshotData: String?) {
        self.orderIndex = step.orderIndex
        self.timestamp = step.timestamp
        self.actionType = step.actionType
        self.screenshotKey = step.screenshotKey
        self.screenshotData = screenshotData
        self.clickX = step.clickX
        self.clickY = step.clickY
        self.viewportWidth = step.viewportWidth
        self.viewportHeight = step.viewportHeight
        self.appBundleID = step.appBundleID
        self.appName = step.appName
        self.windowTitle = step.windowTitle
        self.url = step.url
        self.elementInfo = step.elementInfo
        self.autoCaption = step.autoCaption
    }
}

/// Payload sent to the web API for recording upload.
struct RecordingPayload: Codable, Sendable {
    let recording: RecordingMetadata
    let steps: [UploadStep]
    let audioKey: String?

    enum CodingKeys: String, CodingKey {
        case recording
        case steps
        case audioKey = "audio_key"
    }
}

struct RecordingMetadata: Codable, Sendable {
    var clientID: String? = nil
    let duration: TimeInterval
    let startedAt: String
    let macosVersion: String
    let screenResolution: String
    let appsUsed: [String]

    enum CodingKeys: String, CodingKey {
        case clientID = "client_id"
        case duration
        case startedAt = "started_at"
        case macosVersion = "macos_version"
        case screenResolution = "screen_resolution"
        case appsUsed = "apps_used"
    }
}
