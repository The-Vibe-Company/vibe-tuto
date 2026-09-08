import SwiftUI
import Cocoa

struct CountdownOverlayView: View {
    @ObservedObject private var session = SessionManager.shared
    @State private var displayedNumber: Int = 3
    @State private var numberOpacity: Double = 1

    var body: some View {
        ZStack {
            Color.black.opacity(0.28)
                .ignoresSafeArea()

            VStack(spacing: 12) {
                Text("\(displayedNumber)")
                    .font(.system(size: 96, weight: .thin, design: .rounded))
                    .foregroundStyle(.white)
                    .opacity(numberOpacity)

                Text("Press Esc to cancel")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
        .onAppear {
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
        displayedNumber = number
        numberOpacity = 1
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            withAnimation(.easeOut(duration: 0.18)) {
                numberOpacity = 0.35
            }
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
