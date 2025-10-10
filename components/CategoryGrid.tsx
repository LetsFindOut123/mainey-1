const categories = [
  { emoji: '🎵', name: 'Music' },
  { emoji: '🎬', name: 'Film' },
  { emoji: '🎨', name: 'Art' },
  { emoji: '📸', name: 'Photography' },
  { emoji: '🎭', name: 'Acting' },
  { emoji: '💻', name: 'Tech' },
  { emoji: '🧵', name: 'Fashion' },
  { emoji: '📝', name: 'Writing' }
]

export function CategoryGrid() {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-5xl mx-auto">
      {categories.map(c => (
        <div
          key={c.name}
          className="border border-gray-700 rounded-xl p-6 hover:border-red-500 transition text-center"
        >
          <div className="text-4xl mb-2">{c.emoji}</div>
          <div className="text-lg font-semibold">{c.name}</div>
        </div>
      ))}
    </section>
  )
}
