import SwiftUI

struct UploadPanelView: View {
    let progress: Double
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Uploading")
                    .font(.headline)
                Spacer()
                Text("\(Int(progress * 100))%")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            ProgressView(value: progress)

            HStack {
                Text("\(formattedDuration) · \(session.stepCount) steps")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Cancel") {
                    session.reset()
                }
                .controlSize(.small)
            }
        }
        .padding(16)
        .frame(width: DT.Size.uploadPanelWidth)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }

    private var formattedDuration: String {
        let minutes = Int(session.elapsedTime) / 60
        let seconds = Int(session.elapsedTime) % 60
        return "\(minutes):\(String(format: "%02d", seconds))"
    }
}

struct CompletionPanelView: View {
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Upload complete", systemImage: "checkmark.circle.fill")
                .font(.headline)
                .foregroundStyle(.green)

            HStack {
                Button("Open in Editor", action: openInEditor)
                    .buttonStyle(.borderedProminent)

                Button("Dismiss") {
                    session.reset()
                }
            }
            .controlSize(.small)
        }
        .padding(16)
        .frame(width: DT.Size.uploadPanelWidth, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }

    private func openInEditor() {
        if let url = session.tutorialEditorURL {
            NSWorkspace.shared.open(url)
        }
        session.reset()
    }
}

struct ErrorPanelView: View {
    let message: String
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Upload failed", systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundStyle(.orange)

            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack {
                Button("Retry") {
                    session.retryUpload()
                }
                .buttonStyle(.borderedProminent)

                Button("Save Locally") {
                    session.reset()
                }
            }
            .controlSize(.small)
        }
        .padding(16)
        .frame(width: DT.Size.uploadPanelWidth, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }
}
