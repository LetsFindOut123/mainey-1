export function Footer() {
  return (
    <footer className="border-t border-gray-800 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-6 text-sm text-gray-400 flex flex-col md:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} Mainey — All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/community" className="hover:text-white">Community</a>
          <a href="/projects" className="hover:text-white">Projects</a>
          <a href="/marketplace" className="hover:text-white">Marketplace</a>
        </div>
      </div>
    </footer>
  )
}
