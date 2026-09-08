import SwiftUI

struct DesktopConnectView: View {
    @StateObject private var connection = DesktopConnection()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Connect your workspace").font(.headline)
            Text("Continue in your browser. Your recordings will appear in the same account.")
                .font(.callout).foregroundStyle(.secondary)
            if connection.waiting {
                ProgressView("Waiting for your browser…")
                Button("Cancel", action: connection.cancel)
            } else {
                Button("Connect", action: connection.connect)
                    .buttonStyle(.borderedProminent)
                    .accessibilityIdentifier("connect-workspace")
            }
            if let error = connection.error {
                Text(error).font(.callout).foregroundStyle(.red)
            }
        }
        .onDisappear { connection.cancel() }
    }
}
