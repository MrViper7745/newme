import useIsMobile from '../hooks/useIsMobile'

// Usage: export default withMobile(Dashboard, MobileDashboard)
export default function withMobile(DesktopComponent, MobileComponent) {
  return function ResponsiveWrapper(props) {
    const { isMobile } = useIsMobile()

    // Both components render inside this wrapper
    // isMobile starts as false (SSR safe), updates after mount
    if (isMobile) return <MobileComponent {...props} />
    return <DesktopComponent {...props} />
  }
}