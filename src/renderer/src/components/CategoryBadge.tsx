import type { Category } from '@shared/types'
import { CATEGORY_LABELS, catColor } from '@/lib/categories'

interface CategoryBadgeProps {
  category: Category
  size?: 'sm' | 'md'
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        color: catColor(category),
        backgroundColor: catColor(category, 0.12)
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: catColor(category) }}
      />
      {CATEGORY_LABELS[category]}
    </span>
  )
}
