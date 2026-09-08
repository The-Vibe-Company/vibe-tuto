import XCTest
@testable import VibeTuto

final class CaptureGeometryTests: XCTestCase {
    func testNormalizesPointInsideCaptureFrame() {
        let frame = CGRect(x: 100, y: 200, width: 400, height: 300)

        let point = CaptureGeometry.normalizedPoint(
            CGPoint(x: 300, y: 350),
            in: frame
        )

        XCTAssertNotNil(point)
        XCTAssertEqual(point!.x, 0.5, accuracy: 0.001)
        XCTAssertEqual(point!.y, 0.5, accuracy: 0.001)
    }

    func testRejectsPointOutsideCaptureFrame() {
        let frame = CGRect(x: 100, y: 200, width: 400, height: 300)

        let point = CaptureGeometry.normalizedPoint(
            CGPoint(x: 50, y: 350),
            in: frame
        )

        XCTAssertNil(point)
    }

    func testRegionAreaUsesRegionFrameAndScreenScale() {
        let screens = [
            CaptureGeometry.ScreenSnapshot(
                frame: CGRect(x: 0, y: 0, width: 1440, height: 900),
                visibleFrame: CGRect(x: 0, y: 0, width: 1440, height: 860),
                scale: 2,
                displayID: 1
            ),
        ]

        let area = CaptureGeometry.area(
            for: .region,
            region: CGRect(x: 100, y: 100, width: 500, height: 300),
            mouseLocation: CGPoint(x: 20, y: 20),
            screens: screens
        )

        XCTAssertEqual(area.frame, CGRect(x: 100, y: 100, width: 500, height: 300))
        XCTAssertEqual(area.pixelWidth, 1000)
        XCTAssertEqual(area.pixelHeight, 600)
        XCTAssertEqual(area.resolutionString, "1000x600")
    }

    func testScreenSelectionUsesMouseLocationForFullScreen() {
        let screens = [
            CaptureGeometry.ScreenSnapshot(
                frame: CGRect(x: 0, y: 0, width: 1440, height: 900),
                visibleFrame: CGRect(x: 0, y: 0, width: 1440, height: 860),
                scale: 2,
                displayID: 1
            ),
            CaptureGeometry.ScreenSnapshot(
                frame: CGRect(x: 1440, y: 0, width: 1920, height: 1080),
                visibleFrame: CGRect(x: 1440, y: 0, width: 1920, height: 1040),
                scale: 1,
                displayID: 2
            ),
        ]

        let area = CaptureGeometry.area(
            for: .fullScreen,
            region: nil,
            mouseLocation: CGPoint(x: 2000, y: 500),
            screens: screens
        )

        XCTAssertEqual(area.displayID, 2)
        XCTAssertEqual(area.resolutionString, "1920x1080")
    }
}
