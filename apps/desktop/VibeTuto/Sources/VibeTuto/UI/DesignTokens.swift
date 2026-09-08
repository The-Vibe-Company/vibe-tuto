import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255.0
            g = Double((int >> 8) & 0xFF) / 255.0
            b = Double(int & 0xFF) / 255.0
        default:
            r = 0
            g = 0
            b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}

enum DT {
    enum Colors {
        static let surface = Color(nsColor: .windowBackgroundColor)
        static let card = Color(nsColor: .controlBackgroundColor)
        static let elevated = Color(nsColor: .separatorColor).opacity(0.16)
        static let border = Color(nsColor: .separatorColor)

        static let surfaceNS = NSColor.windowBackgroundColor
        static let borderNS = NSColor.separatorColor

        static let textPrimary = Color.primary
        static let textSecondary = Color.secondary
        static let textTertiary = Color(nsColor: .tertiaryLabelColor)

        static let accentRed = Color.red
        static let accentRedLight = Color.red
        static let accentRedDark = Color.red
        static let accentTeal = Color.green
        static let accentAmber = Color.orange
        static let accentBlue = Color.accentColor

        static let accentRedNS = NSColor.systemRed

        static let glowRed = Color.clear
        static let glowTeal = Color.clear
        static let glowAmber = Color.clear

        static let dividerSubtle = Color(nsColor: .separatorColor).opacity(0.35)
        static let dividerMedium = Color(nsColor: .separatorColor)

        static let warmGradient = LinearGradient(
            colors: [.accentColor, .accentColor],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    enum Typography {
        static let displayLarge = Font.system(size: 128, weight: .thin, design: .rounded)
        static let heading = Font.system(size: 17, weight: .semibold)
        static let subheading = Font.system(size: 13, weight: .semibold)
        static let mono = Font.system(size: 13, weight: .regular, design: .monospaced)
        static let monoSmall = Font.system(size: 11, weight: .regular, design: .monospaced)
        static let sectionLabel = Font.system(size: 11, weight: .semibold)
        static let body = Font.system(size: 13, weight: .regular)
        static let caption = Font.system(size: 11, weight: .regular)
    }

    enum Spacing {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
    }

    enum Radius {
        static let sm: CGFloat = 6
        static let md: CGFloat = 8
        static let lg: CGFloat = 12
    }

    enum Anim {
        static let springSnappy = Animation.easeOut(duration: 0.16)
        static let springGentle = Animation.easeInOut(duration: 0.2)
        static let springBouncy = Animation.easeOut(duration: 0.2)
        static let springOvershoot = Animation.easeInOut(duration: 0.2)
        static let fadeQuick = Animation.easeOut(duration: 0.12)
        static let fadeStandard = Animation.easeInOut(duration: 0.2)
        static let countdownScale = Animation.easeOut(duration: 0.2)
    }

    enum Shadow {
        static let cardColor = Color.black.opacity(0.08)
        static let cardRadius: CGFloat = 8
        static let cardY: CGFloat = 2

        static let floatingColor = Color.black.opacity(0.18)
        static let floatingRadius: CGFloat = 16
        static let floatingY: CGFloat = 6
    }

    enum Size {
        static let mainPanelWidth: CGFloat = 320
        static let toolbarExpandedWidth: CGFloat = 224
        static let toolbarCollapsedWidth: CGFloat = 104
        static let toolbarHeight: CGFloat = 38
        static let toolbarCollapsedHeight: CGFloat = 34
        static let appIconSize: CGFloat = 20
        static let recordingDotSize: CGFloat = 8
        static let borderWidth: CGFloat = 2.0
        static let uploadPanelWidth: CGFloat = 280
        static let uploadPanelHeight: CGFloat = 132
        static let onboardingWidth: CGFloat = 420
        static let onboardingHeight: CGFloat = 360
    }
}

struct RecordButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.vertical, 9)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(Color.red)
            )
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

struct StudioButtonStyle: ButtonStyle {
    var accentBorder: Color? = nil

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(DT.Typography.body)
            .padding(.horizontal, DT.Spacing.md)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.sm, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
            .overlay(
                RoundedRectangle(cornerRadius: DT.Radius.sm, style: .continuous)
                    .strokeBorder(accentBorder ?? Color(nsColor: .separatorColor), lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(DT.Typography.body)
            .foregroundStyle(.secondary)
            .padding(.horizontal, DT.Spacing.sm)
            .padding(.vertical, DT.Spacing.xs)
            .opacity(configuration.isPressed ? 0.65 : 1)
    }
}

struct ToolbarIconStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 28, height: 28)
            .background(
                Circle()
                    .fill(configuration.isPressed ? Color(nsColor: .separatorColor).opacity(0.3) : .clear)
            )
    }
}

struct StudioCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.md, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
    }
}

struct PanelTransitionModifier: ViewModifier {
    func body(content: Content) -> some View {
        content.transition(.opacity.combined(with: .scale(scale: 0.98)))
    }
}

extension View {
    func studioCard() -> some View {
        modifier(StudioCardModifier())
    }

    func panelTransition() -> some View {
        modifier(PanelTransitionModifier())
    }
}

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
