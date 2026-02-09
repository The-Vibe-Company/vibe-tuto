import SwiftUI

/// Dark studio floating recording toolbar.
struct RecordingToolbarView: View {
    @ObservedObject private var session = SessionManager.shared
    @State private var isExpanded = true
    @State private var isHovering = false
    @State private var stepPulse = false
    @State private var collapseTask: Task<Void, Never>?

    var body: some View {
        Group {
            switch session.state {
            case .recording, .paused:
                recordingToolbar
            case .stopping:
                stoppingView
            case .uploading(let progress):
                UploadPanelView(progress: progress)
                    .panelTransition()
            case .completed:
                CompletionPanelView()
                    .panelTransition()
            case .error(let message):
                ErrorPanelView(message: message)
                    .panelTransition()
            case .countdown:
                EmptyView() // Handled by CountdownOverlayController
            default:
                EmptyView()
            }
        }
        .animation(DT.Anim.springGentle, value: session.state)
        .onHover { hovering in
            isHovering = hovering
            if hovering {
                withAnimation(DT.Anim.springOvershoot) {
                    isExpanded = true
                }
                collapseTask?.cancel()
            } else {
                scheduleCollapse()
            }
        }
        .onChange(of: session.stepCount) { _, _ in
            withAnimation(DT.Anim.fadeQuick) { stepPulse = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(DT.Anim.fadeQuick) { stepPulse = false }
            }
        }
        .onAppear { scheduleCollapse() }
        .preferredColorScheme(.dark)
    }

    // MARK: - Recording Toolbar

    private var recordingToolbar: some View {
        HStack(spacing: isExpanded ? DT.Spacing.sm : DT.Spacing.xs) {
            // Pulsing recording dot with glow
            RecordingDot(isPaused: session.state.isPaused)

            // Timer — monospaced instrument style
            Text(formattedTime)
                .font(DT.Typography.mono)
                .foregroundStyle(DT.Colors.textPrimary)
                .monospacedDigit()

            if isExpanded {
                toolbarDivider

                // Step counter with flash effect
                Text("\(session.stepCount) steps")
                    .font(DT.Typography.monoSmall)
                    .foregroundStyle(stepPulse ? DT.Colors.accentAmber : DT.Colors.textSecondary)
                    .padding(.horizontal, DT.Spacing.xs)
                    .padding(.vertical, DT.Spacing.xxs)
                    .background(
                        RoundedRectangle(cornerRadius: DT.Radius.sm)
                            .fill(stepPulse ? DT.Colors.accentAmber.opacity(0.15) : .clear)
                    )
                    .scaleEffect(stepPulse ? 1.1 : 1.0)

                toolbarDivider

                // Pause/Resume
                Button(action: togglePause) {
                    Image(systemName: session.state.isPaused ? "play.fill" : "pause.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(DT.Colors.accentAmber)
                }
                .buttonStyle(ToolbarIconStyle())
                .help(session.state.isPaused ? "Resume recording" : "Pause recording")

                // Add Marker
                Button(action: { session.addMarker() }) {
                    Image(systemName: "flag.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(DT.Colors.accentBlue)
                }
                .buttonStyle(ToolbarIconStyle())
                .help("Add step marker")

                // Stop — prominent red
                Button(action: { session.stopRecording() }) {
                    ZStack {
                        Circle()
                            .fill(DT.Colors.accentRed)
                            .frame(width: 28, height: 28)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(.white)
                            .frame(width: 10, height: 10)
                    }
                }
                .buttonStyle(.plain)
                .help("Stop recording")
            }
        }
        .padding(.horizontal, isExpanded ? DT.Spacing.lg : DT.Spacing.md)
        .padding(.vertical, DT.Spacing.sm)
        .frame(
            width: isExpanded ? DT.Size.toolbarExpandedWidth : DT.Size.toolbarCollapsedWidth,
            height: isExpanded ? DT.Size.toolbarHeight : DT.Size.toolbarCollapsedHeight
        )
        .background(.ultraThinMaterial)
        .background(DT.Colors.surface.opacity(0.5))
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .strokeBorder(DT.Colors.border, lineWidth: 1)
        )
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
        .animation(DT.Anim.springOvershoot, value: isExpanded)
    }

    // MARK: - Stopping View

    private var stoppingView: some View {
        HStack(spacing: DT.Spacing.sm) {
            ProgressView()
                .controlSize(.small)
                .tint(DT.Colors.textSecondary)
            Text("Saving...")
                .font(DT.Typography.monoSmall)
                .foregroundStyle(DT.Colors.textSecondary)
        }
        .padding(.horizontal, DT.Spacing.lg)
        .padding(.vertical, DT.Spacing.sm)
        .frame(width: 130, height: DT.Size.toolbarHeight)
        .background(.ultraThinMaterial)
        .background(DT.Colors.surface.opacity(0.5))
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .strokeBorder(DT.Colors.border, lineWidth: 1)
        )
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }

    // MARK: - Helpers

    private var toolbarDivider: some View {
        Rectangle()
            .fill(DT.Colors.border)
            .frame(width: 1, height: 16)
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

    private func scheduleCollapse() {
        collapseTask?.cancel()
        collapseTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            guard !Task.isCancelled, !isHovering else { return }
            withAnimation(DT.Anim.springOvershoot) {
                isExpanded = false
            }
        }
    }
}

// MARK: - Recording Dot with Glow

struct RecordingDot: View {
    let isPaused: Bool
    @State private var glowing = false

    var body: some View {
        Circle()
            .fill(isPaused ? DT.Colors.accentAmber : DT.Colors.accentRed)
            .frame(width: DT.Size.recordingDotSize, height: DT.Size.recordingDotSize)
            .shadow(
                color: isPaused ? DT.Colors.glowAmber : DT.Colors.glowRed,
                radius: glowing ? 12 : 3
            )
            .scaleEffect(glowing ? 1.4 : 1.0)
            .opacity(isPaused ? 1.0 : (glowing ? 0.6 : 1.0))
            .onAppear {
                if !isPaused {
                    withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                        glowing = true
                    }
                }
            }
            .onChange(of: isPaused) { _, paused in
                if paused {
                    glowing = false
                } else {
                    withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                        glowing = true
                    }
                }
            }
    }
}

// MARK: - State helpers

extension RecordingState {
    var isPaused: Bool {
        if case .paused = self { return true }
        return false
    }
}

// MARK: - NSPanel Controller

/// Manages the floating NSPanel that hosts the recording toolbar.
final class RecordingToolbarController {
    private var panel: NSPanel?

    func show() {
        if panel == nil {
            let hostingView = NSHostingView(rootView: RecordingToolbarView())
            hostingView.frame = NSRect(x: 0, y: 0, width: 340, height: 200)

            let newPanel = NSPanel(
                contentRect: NSRect(x: 0, y: 0, width: 340, height: 200),
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

            if let screen = NSScreen.main {
                let screenFrame = screen.visibleFrame
                let x = screenFrame.midX - 170
                let y = screenFrame.minY + 32
                newPanel.setFrameOrigin(NSPoint(x: x, y: y))
            }

            self.panel = newPanel
        }
        panel?.orderFrontRegardless()
    }

    func hide() {
        panel?.orderOut(nil)
    }
}
