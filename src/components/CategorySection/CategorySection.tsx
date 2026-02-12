import type { Category } from '../../types/nav'
import type { CardStyle, IconStyle } from '../../hooks/useSettings'
import WindowCard from '../WindowCard/WindowCard'
import s from './CategorySection.module.css'

interface Props {
  category: Category
  cardStyle: CardStyle
  iconStyle: IconStyle
}

export default function CategorySection({ category, cardStyle, iconStyle }: Props) {
  const gridCls = [
    s.grid,
    cardStyle === 'launchpad' ? s.gridLaunchpad : '',
  ].filter(Boolean).join(' ')

  return (
    <section>
      <h2 className={`${s.title} ${cardStyle === 'launchpad' ? s.titleLaunchpad : ''}`}>
        {category.title}
      </h2>
      <div className={gridCls}>
        {category.links.map((link, i) => (
          <WindowCard
            key={link.url}
            link={link}
            cardStyle={cardStyle}
            iconStyle={iconStyle}
            index={i}
          />
        ))}
      </div>
    </section>
  )
}
