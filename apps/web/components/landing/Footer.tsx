import Link from "next/link";

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-stone-950 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/captuto-mark.svg"
                alt=""
                className="h-8 w-8 rounded-lg"
              />
              <span className="font-heading text-lg font-semibold text-white">
                CapTuto
              </span>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
              Create professional tutorials from your screen recordings. Powered
              by AI.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">
              Product
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="cursor-pointer text-sm text-stone-500 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">
              Legal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="cursor-pointer text-sm text-stone-500 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">
              Social
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://x.com/captuto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer text-sm text-stone-500 transition-colors hover:text-white"
                >
                  Twitter / X
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-stone-800 pt-8">
          <p className="text-center text-sm text-stone-600">
            &copy; {new Date().getFullYear()} The Vibe Company. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
