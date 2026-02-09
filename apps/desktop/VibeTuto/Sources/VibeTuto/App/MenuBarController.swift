import Cocoa
import SwiftUI
import Combine

/// Manages the NSStatusItem and its popover dropdown panel.
final class MenuBarController: NSObject {
    private var statusItem: NSStatusItem?
    private var popover: NSPopover?
    private var eventMonitor: Any?
    private var recordingToolbarController: RecordingToolbarController?
    private var recordingBorderController: RecordingBorderController?
    private var regionSelectorController: RegionSelectorController?
    private var cancellables = Set<AnyCancellable>()

    override init() {
        super.init()
        setupStatusItem()
        setupPopover()
        setupEventMonitor()
        observeSessionState()
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = statusItem?.button {
            button.image = NSImage(systemSymbolName: "record.circle", accessibilityDescription: "CapTuto Recorder, idle")
            button.action = #selector(togglePopover(_:))
            button.target = self
        }
    }

    private func setupPopover() {
        let popover = NSPopover()
        popover.contentSize = NSSize(width: 280, height: 360)
        popover.behavior = .transient
        popover.animates = true
        popover.contentViewController = NSHostingController(rootView: MenuBarDropdownView())
        self.popover = popover
    }

    private func setupEventMonitor() {
        eventMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
            if let popover = self?.popover, popover.isShown {
                popover.performClose(nil)
            }
        }
    }

    private func observeSessionState() {
        Task { @MainActor in
            SessionManager.shared.$state
                .receive(on: DispatchQueue.main)
                .sink { [weak self] state in
                    self?.updateMenuBarIcon(for: state)
                    self?.handleStateTransition(state)
                }
                .store(in: &cancellables)
        }
    }

    @objc private func togglePopover(_ sender: AnyObject?) {
        guard let button = statusItem?.button else { return }

        if let popover = popover, popover.isShown {
            popover.performClose(sender)
        } else {
            popover?.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        }
    }

    private func updateMenuBarIcon(for state: RecordingState) {
        guard let button = statusItem?.button else { return }

        switch state {
        case .idle:
            button.image = NSImage(systemSymbolName: "record.circle", accessibilityDescription: "CapTuto Recorder, idle")

        case .recording:
            let config = NSImage.SymbolConfiguration(paletteColors: [.systemRed])
            button.image = NSImage(systemSymbolName: "record.circle.fill", accessibilityDescription: "CapTuto Recorder, recording")?
                .withSymbolConfiguration(config)

        case .paused:
            let config = NSImage.SymbolConfiguration(paletteColors: [.systemYellow])
            button.image = NSImage(systemSymbolName: "pause.circle.fill", accessibilityDescription: "CapTuto Recorder, paused")?
                .withSymbolConfiguration(config)

        case .uploading:
            button.image = NSImage(systemSymbolName: "arrow.up.circle", accessibilityDescription: "CapTuto Recorder, uploading")

        case .completed:
            let config = NSImage.SymbolConfiguration(paletteColors: [.systemGreen])
            button.image = NSImage(systemSymbolName: "checkmark.circle.fill", accessibilityDescription: "CapTuto Recorder, upload complete")?
                .withSymbolConfiguration(config)
            // Revert to idle icon after 5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                self?.updateMenuBarIcon(for: .idle)
            }

        case .error:
            let config = NSImage.SymbolConfiguration(paletteColors: [.systemYellow])
            button.image = NSImage(systemSymbolName: "exclamationmark.triangle.fill", accessibilityDescription: "CapTuto Recorder, error")?
                .withSymbolConfiguration(config)

        case .selectingRegion, .countdown, .stopping:
            break
        }
    }

    private func handleStateTransition(_ state: RecordingState) {
        switch state {
        case .selectingRegion:
            popover?.performClose(nil)
            showRegionSelector()

        case .recording:
            popover?.performClose(nil)
            showRecordingToolbar()
            showRecordingBorder()

        case .stopping, .uploading:
            hideRecordingBorder()
            // Toolbar stays visible — shows saving/upload/completion UI

        case .completed, .error:
            break // Toolbar stays visible — shows completion/error panel

        case .idle:
            hideRecordingToolbar()
            hideRecordingBorder()

        default:
            break
        }
    }

    private func showRecordingToolbar() {
        if recordingToolbarController == nil {
            recordingToolbarController = RecordingToolbarController()
        }
        recordingToolbarController?.show()
    }

    private func hideRecordingToolbar() {
        recordingToolbarController?.hide()
    }

    private func showRegionSelector() {
        if regionSelectorController == nil {
            regionSelectorController = RegionSelectorController()
        }
        regionSelectorController?.show(
            onSelected: { [weak self] rect in
                Task { @MainActor in
                    SessionManager.shared.regionSelected(rect: rect)
                    self?.regionSelectorController = nil
                }
            },
            onCancelled: { [weak self] in
                Task { @MainActor in
                    SessionManager.shared.reset()
                    self?.regionSelectorController = nil
                }
            }
        )
    }

    private func showRecordingBorder() {
        if recordingBorderController == nil {
            recordingBorderController = RecordingBorderController()
        }
        Task { @MainActor in
            let region = SessionManager.shared.selectedRegion
            recordingBorderController?.show(region: region)
        }
    }

    private func hideRecordingBorder() {
        recordingBorderController?.hide()
    }

    deinit {
        if let eventMonitor {
            NSEvent.removeMonitor(eventMonitor)
        }
    }
}
