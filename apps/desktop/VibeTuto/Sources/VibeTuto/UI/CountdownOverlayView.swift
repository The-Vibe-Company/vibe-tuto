import SwiftUI
import Cocoa

// MARK: - Film-Leader Countdown Overlay

struct CountdownOverlayView: View {
    @ObservedObject private var session = SessionManager.shared
    @State private var displayedNumber: Int = 3
    @State private var numberScale: CGFloat = 0.3
    @State private var numberOpacity: Double = 0
    @State private var ringProgress: CGFloat = 1.0
    @State private var recDotVisible = true

    var body: some View {
        ZStack {
            // Dimmed background
            Color.black.opacity(0.5)
                .ignoresSafeArea()

            VStack(spacing: DT.Spacing.xxl) {
                // Film-leader reticle
                ZStack {
                    // Outer reference circle
                    Circle()
                        .stroke(Color.white.opacity(0.12), lineWidth: 2)
                        .frame(width: 200, height: 200)

                    // Crosshairs through center
                    Rectangle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 200, height: 1)
                    Rectangle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 1, height: 200)

                    // Progress ring — drains each second
                    Circle()
                        .trim(from: 0, to: ringProgress)
                        .stroke(
                            DT.Colors.accentRed,
                            style: StrokeStyle(lineWidth: 3, lineCap: .round)
                        )
                        .frame(width: 200, height: 200)
                        .rotationEffect(.degrees(-90))

                    // The number
                    Text("\(displayedNumber)")
                        .font(DT.Typography.displayLarge)
                        .foregroundStyle(.white)
                        .scaleEffect(numberScale)
                        .opacity(numberOpacity)
                }

                // "REC" indicator with blinking dot
                HStack(spacing: DT.Spacing.sm) {
                    Circle()
                        .fill(DT.Colors.accentRed)
                        .frame(width: 6, height: 6)
                        .opacity(recDotVisible ? 1.0 : 0.2)
                    Text("REC")
                        .font(DT.Typography.monoSmall)
                        .tracking(2)
                        .foregroundStyle(DT.Colors.accentRed)
                }

                // Escape hint
                Text("Press Esc to cancel")
                    .font(DT.Typography.monoSmall)
                    .foregroundStyle(DT.Colors.textTertiary)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            startBlinkingDot()
            if case .countdown(let remaining) = session.state {
                animateNumber(remaining)
            }
        }
        .onChange(of: session.state) { _, newState in
            if case .countdown(let remaining) = newState {
                animateNumber(remaining)
            }
        }
    }

    private func animateNumber(_ number: Int) {
        // Reset for new number
        numberScale = 0.3
        numberOpacity = 0
        ringProgress = 1.0
        displayedNumber = number

        // Scale in + fade in
        withAnimation(DT.Anim.countdownScale) {
            numberScale = 1.0
            numberOpacity = 1.0
        }

        // Drain ring over ~0.9s
        withAnimation(.linear(duration: 0.9)) {
            ringProgress = 0
        }

        // Fade number at end of second
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            withAnimation(.easeIn(duration: 0.25)) {
                numberOpacity = 0.2
                numberScale = 0.85
            }
        }
    }

    private func startBlinkingDot() {
        withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
            recDotVisible.toggle()
        }
    }
}

// MARK: - Controller (NSPanel wrapper)

final class CountdownOverlayController {
    private var panel: NSPanel?
    private var keyMonitor: Any?

    func show() {
        if panel != nil { return } // Already showing — SwiftUI view handles updates
        guard let screen = NSScreen.main else { return }

        let hostingView = NSHostingView(rootView: CountdownOverlayView())
        hostingView.frame = screen.frame

        let overlayPanel = NSPanel(
            contentRect: screen.frame,
            styleMask: [.nonactivatingPanel, .borderless],
            backing: .buffered,
            defer: false
        )
        overlayPanel.level = .screenSaver
        overlayPanel.backgroundColor = .clear
        overlayPanel.isOpaque = false
        overlayPanel.hasShadow = false
        overlayPanel.ignoresMouseEvents = true
        overlayPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        overlayPanel.contentView = hostingView
        overlayPanel.setFrame(screen.frame, display: true)
        overlayPanel.orderFrontRegardless()

        self.panel = overlayPanel

        // Escape key to cancel — use global monitor since app is accessory/LSUIElement
        keyMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { event in
            if event.keyCode == 53 { // Escape
                Task { @MainActor in
                    SessionManager.shared.reset()
                }
            }
        }
    }

    func hide() {
        panel?.orderOut(nil)
        panel = nil
        if let monitor = keyMonitor {
            NSEvent.removeMonitor(monitor)
            keyMonitor = nil
        }
    }
}
