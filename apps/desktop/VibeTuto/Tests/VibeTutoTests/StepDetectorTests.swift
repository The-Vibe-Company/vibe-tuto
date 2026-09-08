import XCTest
@testable import VibeTuto

final class StepDetectorTests: XCTestCase {
    var detector: StepDetector!

    override func setUp() {
        super.setUp()
        detector = StepDetector()
    }

    func testClickWithButtonElementGeneratesStep() {
        let action = CapturedAction(
            relativeTime: 1.0,
            actionType: .click,
            clickX: 0.5,
            clickY: 0.3,
            viewportWidth: 2560,
            viewportHeight: 1600,
            appBundleID: "com.apple.Safari",
            appName: "Safari",
            windowTitle: "GitHub",
            elementInfo: ElementInfo(
                role: "AXButton",
                title: "Submit",
                value: nil,
                parentChain: ["AXToolbar", "AXWindow"]
            )
        )

        let step = detector.processAction(action, orderIndex: 0)
        XCTAssertNotNil(step)
        XCTAssertEqual(step?.orderIndex, 0)
        XCTAssertEqual(step?.actionType, .click)
        XCTAssertEqual(step?.autoCaption, "Click the 'Submit' button")
    }

    func testKeyboardShortcutGeneratesStep() {
        let action = CapturedAction(
            relativeTime: 2.0,
            actionType: .keyboardShortcut,
            appBundleID: "com.microsoft.VSCode",
            appName: "Visual Studio Code",
            keyCombo: "Cmd+S"
        )

        let step = detector.processAction(action, orderIndex: 0)
        XCTAssertNotNil(step)
        XCTAssertEqual(step?.actionType, .keyboardShortcut)
        XCTAssertEqual(step?.autoCaption, "Save (Cmd+S)")
    }

    func testScrollEventIsFilteredOut() {
        let action = CapturedAction(
            relativeTime: 3.0,
            actionType: .scroll
        )

        let step = detector.processAction(action, orderIndex: 0)
        // Scroll has very low confidence (0.1), below threshold (0.3)
        XCTAssertNil(step)
    }

    func testDebouncingFiltersRapidActions() {
        let action1 = CapturedAction(
            relativeTime: 1.0,
            actionType: .click,
            clickX: 0.5,
            clickY: 0.3,
            elementInfo: ElementInfo(role: "AXButton", title: "OK", value: nil, parentChain: [])
        )
        let action2 = CapturedAction(
            relativeTime: 1.2, // only 0.2s later, within debounce window
            actionType: .click,
            clickX: 0.6,
            clickY: 0.4,
            elementInfo: ElementInfo(role: "AXButton", title: "Cancel", value: nil, parentChain: [])
        )

        let step1 = detector.processAction(action1, orderIndex: 0)
        let step2 = detector.processAction(action2, orderIndex: 1)

        XCTAssertNotNil(step1)
        XCTAssertNil(step2) // debounced
    }

    func testAppSwitchGeneratesStep() {
        let action = CapturedAction(
            relativeTime: 5.0,
            actionType: .appSwitch,
            appBundleID: "com.google.Chrome",
            appName: "Google Chrome"
        )

        let step = detector.processAction(action, orderIndex: 0)
        XCTAssertNotNil(step)
        XCTAssertEqual(step?.autoCaption, "Switch to Google Chrome")
    }

    func testManualMarkerAlwaysGeneratesStep() {
        let action = CapturedAction(
            relativeTime: 10.0,
            actionType: .manualMarker
        )

        let step = detector.processAction(action, orderIndex: 0)
        XCTAssertNotNil(step)
        XCTAssertEqual(step?.autoCaption, "Manual step marker")
    }

    func testResetClearsState() {
        let action1 = CapturedAction(
            relativeTime: 1.0,
            actionType: .click,
            elementInfo: ElementInfo(role: "AXButton", title: "OK", value: nil, parentChain: [])
        )
        _ = detector.processAction(action1, orderIndex: 0)

        detector.reset()

        // After reset, an action at time 0 should work again
        let action2 = CapturedAction(
            relativeTime: 0.0,
            actionType: .click,
            elementInfo: ElementInfo(role: "AXButton", title: "OK", value: nil, parentChain: [])
        )
        let step = detector.processAction(action2, orderIndex: 0)
        XCTAssertNotNil(step)
    }

    func testConfiguredGroupingDelayControlsDebounceWindow() {
        detector.configure(sensitivity: 1, groupingDelayMS: 100)
        let action1 = CapturedAction(
            relativeTime: 1.0,
            actionType: .click,
            elementInfo: ElementInfo(role: "AXButton", title: "First", value: nil, parentChain: [])
        )
        let action2 = CapturedAction(
            relativeTime: 1.2,
            actionType: .click,
            elementInfo: ElementInfo(role: "AXButton", title: "Second", value: nil, parentChain: [])
        )

        XCTAssertNotNil(detector.processAction(action1, orderIndex: 0))
        XCTAssertNotNil(detector.processAction(action2, orderIndex: 1))
    }

    func testURLChangePromotesActionToNavigationStep() {
        let first = CapturedAction(
            relativeTime: 1.0,
            actionType: .click,
            appName: "Safari",
            url: "https://example.com/start",
            elementInfo: ElementInfo(role: "AXButton", title: "Next", value: nil, parentChain: [])
        )
        let second = CapturedAction(
            relativeTime: 2.0,
            actionType: .click,
            appName: "Safari",
            url: "https://example.com/done",
            elementInfo: ElementInfo(role: "AXButton", title: "Next", value: nil, parentChain: [])
        )

        _ = detector.processAction(first, orderIndex: 0)
        let step = detector.processAction(second, orderIndex: 1)

        XCTAssertEqual(step?.actionType, .urlNavigation)
        XCTAssertEqual(step?.autoCaption, "Navigate to https://example.com/done")
    }
}
