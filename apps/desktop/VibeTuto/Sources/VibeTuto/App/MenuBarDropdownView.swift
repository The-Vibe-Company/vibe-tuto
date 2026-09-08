import SwiftUI
import Cocoa

struct FloatingPanelView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("lastRecordingMode") private var lastMode = RecordingMode.fullScreen.rawValue
    @AppStorage("apiToken") private var apiToken = ""

    private let permissionChecker = PermissionChecker()
    private let modes: [(mode: RecordingMode, label: String, icon: String)] = [
        (.fullScreen, "Screen", "rectangle.on.rectangle"),
        (.singleApp, "App", "app"),
        (.region, "Area", "selection.pin.in.out"),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("CapTuto")
                            .font(.system(size: 26, weight: .semibold))
                        Text("Show it once. Make it clear.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    SettingsLink {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }

                Divider()

                if session.state == .idle && apiToken.isEmpty {
                    DesktopConnectView()
                } else if session.state == .idle {
                    idleControls
                    permissionNotice

                    if session.pendingRecordingCount > 0 {
                        Button(
                            "Resume saved recording (\(session.pendingRecordingCount))",
                            action: session.resumePendingUpload
                        )
                        .accessibilityIdentifier("resume-upload")
                    }

                    recentRecordings
                } else {
                    Text(statusDescription)
                        .font(.headline)
                    Text("\(formattedElapsedTime) · \(session.stepCount) steps")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                    nativeControls
                }

                Text("Capture here. Refine and share in your workspace.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(22)
        }
        .frame(width: DT.Size.mainPanelWidth, height: 360)
        .background { CapturePanelSurface() }
        .onChange(of: lastMode) { _, newMode in
            if newMode != RecordingMode.singleApp.rawValue {
                session.selectedAppBundleID = nil
            }
            if newMode != RecordingMode.region.rawValue {
                session.selectedRegion = nil
            }
        }
    }

    private var idleControls: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("Capture", selection: $lastMode) {
                ForEach(modes, id: \.mode) { item in
                    Label(item.label, systemImage: item.icon)
                        .tag(item.mode.rawValue)
                }
            }
            .pickerStyle(.segmented)
            .accessibilityIdentifier("capture-mode")

            if lastMode == RecordingMode.singleApp.rawValue {
                AppPickerView()
                    .frame(maxHeight: 140)
            }

            Toggle("Record microphone", isOn: $session.micEnabled)
                .accessibilityIdentifier("record-microphone")

            Text("Clicks become steps. Your narration adds context.")
                .font(.callout)
                .foregroundStyle(.secondary)

            Button(action: startRecording) {
                Label(primaryActionLabel, systemImage: "record.circle")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent)
            .tint(.primary)
            .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)
            .accessibilityIdentifier("start-recording")
        }
    }

    @ViewBuilder
    private var nativeControls: some View {
        switch session.state {
        case .recording:
            HStack {
                Button("Pause", action: session.pauseRecording)
                Button("Finish recording", action: session.stopRecording)
                    .buttonStyle(.borderedProminent)
            }
        case .paused:
            HStack {
                Button("Resume", action: session.resumeRecording)
                Button("Finish recording", action: session.stopRecording)
                    .buttonStyle(.borderedProminent)
            }
        case .uploading(let progress):
            ProgressView(value: progress)
        case .completed:
            HStack {
                Button("Open tutorial") {
                    if let url = session.tutorialEditorURL {
                        NSWorkspace.shared.open(url)
                    }
                    session.reset()
                }
                .buttonStyle(.borderedProminent)
                Button("New recording", action: session.reset)
            }
        case .error(let message):
            VStack(alignment: .leading, spacing: 8) {
                Text(message)
                    .font(.callout)
                    .foregroundStyle(.red)
                    .lineLimit(3)
                HStack {
                    if session.canRetryUpload {
                        Button("Retry upload", action: session.retryUpload)
                    }
                    Button("Start again", action: session.reset)
                }
            }
        default:
            ProgressView()
        }
    }

    @ViewBuilder
    private var permissionNotice: some View {
        let screenGranted = permissionChecker.checkScreenRecordingSilent() == .granted
        let accessibilityGranted = permissionChecker.checkAccessibility() == .granted

        if !screenGranted || !accessibilityGranted || !session.actionDetectionEnabled {
            VStack(alignment: .leading, spacing: 8) {
                if !screenGranted {
                    permissionRow("Screen Recording", icon: "rectangle.dashed.badge.record") {
                        permissionChecker.requestScreenRecording()
                    }
                }
                if !accessibilityGranted {
                    permissionRow("Accessibility", icon: "hand.point.up.left") {
                        permissionChecker.promptAccessibility()
                    }
                }
                if !session.actionDetectionEnabled {
                    Toggle("Detect actions", isOn: $session.actionDetectionEnabled)
                        .toggleStyle(.checkbox)
                        .font(.caption)
                }
            }
            .padding(10)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
        }
    }

    private func permissionRow(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        HStack {
            Label(title, systemImage: icon)
                .font(.caption)
            Spacer()
            Button("Allow", action: action)
                .controlSize(.small)
        }
    }

    @ViewBuilder
    private var recentRecordings: some View {
        let recordings = UserDefaults.standard.array(forKey: "recentRecordings") as? [[String: String]] ?? []
        if !recordings.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                Text("Recent")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                ForEach(Array(recordings.prefix(3).enumerated()), id: \.offset) { _, recording in
                    Button {
                        openRecentRecording(recording)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(recording["title"] ?? "Desktop Recording")
                                    .lineLimit(1)
                                Text(relativeDate(recording["created_at"]))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var statusDescription: String {
        switch session.state {
        case .idle: return "Record the screen, one app, or a selected area."
        case .selectingRegion: return "Draw the exact area you want to capture."
        case .countdown: return "Getting out of the way before recording starts."
        case .recording: return "Use the floating controls to pause or stop."
        case .paused: return "Resume when you are ready."
        case .stopping: return "Wrapping up the capture."
        case .uploading: return "Sending the recording to your workspace."
        case .completed: return "Your recording finished successfully."
        case .error: return "The recording flow was interrupted."
        }
    }

    private var formattedElapsedTime: String {
        let totalSeconds = Int(session.elapsedTime)
        return String(format: "%02d:%02d", totalSeconds / 60, totalSeconds % 60)
    }

    private var primaryActionLabel: String {
        switch RecordingMode(rawValue: lastMode) ?? .fullScreen {
        case .fullScreen: return "Record Screen"
        case .singleApp: return "Record App"
        case .region: return "Select Area"
        }
    }

    private func startRecording() {
        session.currentMode = RecordingMode(rawValue: lastMode) ?? .fullScreen
        let hasCountdownPreference = UserDefaults.standard.object(forKey: "showCountdown") != nil
        let showCountdown = hasCountdownPreference ? UserDefaults.standard.bool(forKey: "showCountdown") : true
        let duration = UserDefaults.standard.integer(forKey: "countdownDuration")
        session.startRecording(countdown: showCountdown ? (duration == 0 ? 3 : duration) : 0)
    }

    private func openRecentRecording(_ recording: [String: String]) {
        guard let id = recording["id"] else { return }
        let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
        if let url = URL(string: "\(baseURL)/editor/\(id)?source=desktop") {
            NSWorkspace.shared.open(url)
        }
    }

    private func relativeDate(_ isoString: String?) -> String {
        guard let isoString, let date = ISO8601DateFormatter().date(from: isoString) else {
            return "recently"
        }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

private struct CapturePanelSurface: View {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        if reduceTransparency {
            Color(nsColor: .windowBackgroundColor)
        } else {
            glassSurface
        }
    }

    @ViewBuilder
    private var glassSurface: some View {
        #if compiler(>=6.2)
        if #available(macOS 26.0, *) {
            Color.clear.glassEffect(.regular, in: RoundedRectangle(cornerRadius: 22))
        } else {
            Rectangle().fill(.regularMaterial)
        }
        #else
        Rectangle().fill(.regularMaterial)
        #endif
    }
}
