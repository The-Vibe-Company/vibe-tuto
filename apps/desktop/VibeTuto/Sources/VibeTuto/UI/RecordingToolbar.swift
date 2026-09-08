import SwiftUI

struct RecordingToolbarView: View {
    @ObservedObject private var session = SessionManager.shared
    @State private var showsSecondaryActions = false

    var body: some View {
        Group {
            switch session.state {
            case .recording, .paused:
                recordingToolbar
                    .panelTransition()
            case .stopping:
                savingView
                    .panelTransition()
            case .uploading(let progress):
                UploadPanelView(progress: progress)
                    .panelTransition()
            case .completed:
                CompletionPanelView()
                    .panelTransition()
            case .error(let message):
                ErrorPanelView(message: message)
                    .panelTransition()
            default:
                EmptyView()
            }
        }
        .animation(DT.Anim.fadeStandard, value: session.state)
    }

    private var recordingToolbar: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(session.state.isPaused ? .orange : .red)
                .frame(width: 8, height: 8)

            Text(formattedTime)
                .font(.system(size: 13, weight: .medium, design: .monospaced))
                .monospacedDigit()

            if showsSecondaryActions {
                Text("\(session.stepCount)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .help("\(session.stepCount) detected steps")

                Button(action: togglePause) {
                    Image(systemName: session.state.isPaused ? "play.fill" : "pause.fill")
                }
                .buttonStyle(ToolbarIconStyle())
                .help(session.state.isPaused ? "Resume" : "Pause")

                Button(action: session.addMarker) {
                    Image(systemName: "flag")
                }
                .buttonStyle(ToolbarIconStyle())
                .disabled(session.state != .recording)
                .help("Add marker")
            }

            Button(action: session.stopRecording) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 24, height: 24)
                    .background(Circle().fill(Color.red))
            }
            .buttonStyle(.plain)
            .help("Stop recording")
        }
        .padding(.leading, 14)
        .padding(.trailing, 8)
        .padding(.vertical, 7)
        .background(.regularMaterial)
        .clipShape(Capsule(style: .continuous))
        .overlay(
            Capsule(style: .continuous)
                .strokeBorder(Color(nsColor: .separatorColor).opacity(0.35), lineWidth: 1)
        )
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
        .onHover { hovering in
            withAnimation(DT.Anim.fadeStandard) {
                showsSecondaryActions = hovering
            }
        }
    }

    private var savingView: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.small)
            Text("Saving")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(.regularMaterial)
        .clipShape(Capsule(style: .continuous))
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }

    private var formattedTime: String {
        let minutes = Int(session.elapsedTime) / 60
        let seconds = Int(session.elapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    private func togglePause() {
        if case .paused = session.state {
            session.resumeRecording()
        } else {
            session.pauseRecording()
        }
    }
}

extension RecordingState {
    var isPaused: Bool {
        if case .paused = self { return true }
        return false
    }
}

@MainActor
final class RecordingToolbarController {
    private var panel: NSPanel?

    func show() {
        if panel == nil {
            let hostingView = NSHostingView(rootView: RecordingToolbarView())
            hostingView.frame = NSRect(x: 0, y: 0, width: 320, height: 180)

            let newPanel = NSPanel(
                contentRect: NSRect(x: 0, y: 0, width: 320, height: 180),
                styleMask: [.nonactivatingPanel, .borderless],
                backing: .buffered,
                defer: false
            )
            newPanel.isFloatingPanel = true
            newPanel.level = .floating
            newPanel.backgroundColor = .clear
            newPanel.isOpaque = false
            newPanel.hasShadow = false
            newPanel.isMovableByWindowBackground = true
            newPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            newPanel.contentView = hostingView
            panel = newPanel
        }

        positionPanel()
        panel?.orderFrontRegardless()
    }

    func hide() {
        panel?.orderOut(nil)
    }

    private func positionPanel() {
        guard let panel else { return }
        let captureFrame = SessionManager.shared.currentCaptureArea.frame
        let screen = NSScreen.screens.first { $0.frame.intersects(captureFrame) }
            ?? NSScreen.main
            ?? NSScreen.screens.first
        guard let visibleFrame = screen?.visibleFrame else { return }
        let size = panel.frame.size
        panel.setFrameOrigin(NSPoint(
            x: min(max(captureFrame.midX - size.width / 2, visibleFrame.minX + 12), visibleFrame.maxX - size.width - 12),
            y: min(max(captureFrame.minY + 28, visibleFrame.minY + 12), visibleFrame.maxY - size.height - 12)
        ))
    }
}
