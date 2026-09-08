import SwiftUI

struct FloatingPanelView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("lastRecordingMode") private var lastMode: String = RecordingMode.fullScreen.rawValue

    @AppStorage("apiToken") private var apiToken = ""

    private let modes: [(mode: RecordingMode, label: String, icon: String)] = [
        (.fullScreen, "Screen", "rectangle.on.rectangle"),
        (.singleApp, "App", "app"),
        (.region, "Area", "selection.pin.in.out"),
    ]

    var body: some View {
        ScrollView {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("CapTuto").font(.system(size: 28, weight: .semibold))
                    Text("Show it once. Make it clear.").font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                SettingsLink { Image(systemName: "gearshape") }
                    .accessibilityLabel("Settings")
            }
            Divider()
            if session.state == .idle && apiToken.isEmpty {
                DesktopConnectView()
            } else if session.state == .idle {
                Picker("Capture", selection: $lastMode) {
                    ForEach(modes, id: \.mode) { item in
                        Text(item.label).tag(item.mode.rawValue)
                    }
                }.pickerStyle(.segmented).accessibilityIdentifier("capture-mode")
                if lastMode == RecordingMode.singleApp.rawValue { AppPickerView() }
                Toggle("Record microphone", isOn: $session.micEnabled)
                    .accessibilityIdentifier("record-microphone")
                Text("Clicks become steps. Your narration adds context.")
                    .font(.callout).foregroundStyle(.secondary)
                Button(action: startRecording) {
                    Label(primaryActionLabel, systemImage: "record.circle")
                        .frame(maxWidth: .infinity).padding(.vertical, 8)
                }.buttonStyle(.borderedProminent).tint(.primary)
                    .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)
                    .accessibilityIdentifier("start-recording")
                if session.pendingRecordingCount > 0 {
                    Button("Resume saved recording (\(session.pendingRecordingCount))", action: session.resumePendingUpload)
                        .accessibilityIdentifier("resume-upload")
                }
            } else {
                Text(statusDescription).font(.headline)
                Text("\(formattedElapsedTime) · \(session.stepCount) steps").monospacedDigit().foregroundStyle(.secondary)
                nativeControls
            }
            Spacer(minLength: 0)
            Text("Capture here. Refine and share in your workspace.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(24).padding(.top, 20)
        }
        .frame(width: DT.Size.floatingPanelWidth, height: DT.Size.floatingPanelHeight)
        .background { CapturePanelSurface() }
    }

    @ViewBuilder private var nativeControls: some View {
        switch session.state {
        case .recording:
            HStack {
                Button("Pause", action: session.pauseRecording)
                Button("Finish recording", action: session.stopRecording).buttonStyle(.borderedProminent)
            }
        case .paused:
            HStack {
                Button("Resume", action: session.resumeRecording)
                Button("Finish recording", action: session.stopRecording).buttonStyle(.borderedProminent)
            }
        case .uploading(let progress): ProgressView(value: progress)
        case .completed:
            Button("Open tutorial") {
                if let url = session.tutorialEditorURL { NSWorkspace.shared.open(url) }
                session.reset()
            }.buttonStyle(.borderedProminent)
            Button("New recording", action: session.reset)
        case .error(let message):
            Text(message).font(.callout).foregroundStyle(.red)
            if session.canRetryUpload {
                Button("Retry upload", action: session.retryUpload)
            } else {
                Button("Start again", action: session.reset)
            }
            Button("Back", action: session.reset)
        default: ProgressView()
        }
    }

    private var statusDescription: String {
        switch session.state {
        case .idle:
            return "Record the screen, one app, or a selected area."
        case .selectingRegion:
            return "Draw the exact area you want to capture."
        case .countdown:
            return "Getting out of the way before recording starts."
        case .recording:
            return "Use the floating controls to pause or stop."
        case .paused:
            return "Resume when you are ready."
        case .stopping:
            return "Wrapping up the capture."
        case .uploading:
            return "Sending the recording to your workspace."
        case .completed:
            return "Your recording finished successfully."
        case .error:
            return "The recording flow was interrupted."
        }
    }

    private var formattedElapsedTime: String {
        let totalSeconds = Int(session.elapsedTime)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
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
        session.startRecording()
    }

    private func showPreferences() {
        NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
    }
}

private struct NativePanelBackground: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .hudWindow
        view.state = .active
        view.blendingMode = .behindWindow
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}

private struct PrimaryCaptureButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.black)
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white)
            )
            .opacity(configuration.isPressed ? 0.88 : 1)
            .scaleEffect(configuration.isPressed ? 0.99 : 1)
    }
}

private struct SecondaryCaptureButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.08))
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

private struct FooterLinkButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Color(nsColor: .secondaryLabelColor))
            .opacity(configuration.isPressed ? 0.7 : 1)
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
    @ViewBuilder private var glassSurface: some View {
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
