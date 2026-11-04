/**
 * Shared Logo component.
 */

import appLogo from '../../../assets/logo.svg'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center ${compact ? 'gap-0' : 'gap-[12px]'} font-manrope font-black text-[28px] tracking-[-1.5px] text-ink`}
    >
      <img
        className={`block object-cover ${compact ? 'w-[43px] h-[43px] rounded-[14px]' : 'w-[48px] h-[48px] rounded-[15px]'}`}
        src={appLogo}
        alt="Crave"
      />
      {!compact && <span>CRAVE.</span>}
    </div>
  )
}
