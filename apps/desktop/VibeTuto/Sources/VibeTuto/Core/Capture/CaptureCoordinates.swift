import CoreGraphics

/// Converts normalized full-screen clicks into the coordinate system of the saved image.
enum CaptureCoordinates {
    static func imagePoint(x: CGFloat?, y: CGFloat?, screenSize: CGSize, region: CGRect?) -> CGPoint? {
        guard let x, let y, screenSize.width > 0, screenSize.height > 0 else { return nil }
        let bounds = region ?? CGRect(origin: .zero, size: screenSize)
        guard bounds.width > 0, bounds.height > 0 else { return nil }
        let point = CGPoint(x: x * screenSize.width, y: y * screenSize.height)
        guard bounds.contains(point) else { return nil }
        return CGPoint(x: (point.x - bounds.minX) / bounds.width, y: (point.y - bounds.minY) / bounds.height)
    }
}
