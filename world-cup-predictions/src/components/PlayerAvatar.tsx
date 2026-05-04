import type { ComponentProps } from 'react'
import { initials } from '../utils/text'

const playerTooltipProps = (name: string) => ({
  'aria-label': name,
  'data-player-name': name,
  title: name,
})

export const PlayerInitials = ({ name, className }: { name: string; className?: string }) => (
  <span className={['player-initials', className].filter(Boolean).join(' ')} {...playerTooltipProps(name)}>
    {initials(name)}
  </span>
)

export const PlayerAvatar = ({
  name,
  className,
  ...props
}: { name: string; className?: string } & Omit<ComponentProps<'div'>, 'children'>) => (
  <div className={['avatar', className].filter(Boolean).join(' ')} {...playerTooltipProps(name)} {...props}>
    {initials(name)}
  </div>
)
