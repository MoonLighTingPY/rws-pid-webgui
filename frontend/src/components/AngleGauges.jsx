import { useRef, useEffect, useState } from 'react'
import { Box, VStack, HStack, Text, CircularProgress } from '@chakra-ui/react'
import { useStore } from '../store'

export default function AngleGauges() {
  const { state } = useStore()
  const last = state.chart.angleData.slice(-1)[0] || {}
  const pitch = last.pitch_angle ?? 0
  const roll  = last.roll_angle  ?? 0
  const toPct = a => (a + 180) / 360 * 100

  const twScale = 1.5
  const containerRef = useRef(null)
  const [availablePx, setAvailablePx] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      // Two vertical gauges: each gets roughly half height minus spacing
      const perGaugeH = Math.max(60, (rect.height - 28) / 2)
      const perGaugeW = rect.width * 0.92
      setAvailablePx(Math.max(48, Math.min(perGaugeW, perGaugeH)))
    })
    ro.observe(el)
    // initial measure
    const rect = el.getBoundingClientRect()
    const perGaugeH = Math.max(60, (rect.height - 28) / 2)
    const perGaugeW = rect.width * 0.92
    setAvailablePx(Math.max(48, Math.min(perGaugeW, perGaugeH)))
    return () => ro.disconnect()
  }, [])

  // Base and computed gauge size (no transform scaling; use real box size)
  const basePx = 80
  const desired = basePx * twScale
  const gaugeSize = Math.round(
    Math.max(48, Math.min(desired, availablePx || desired))
  )
  const scale = gaugeSize / basePx

  // Derived dimensions
  const thickness = `${0.45 * scale}rem`
  const centerCap = `${8 * scale}px`
  const needleHeight = `${2 * scale}px`
  const needleWidthPct = Math.min(93, 80 * scale)
  const needleLeftPct = (100 - needleWidthPct) / 2
  const labelSize = `${Math.max(10, Math.round(12 * scale))}px`
  const valueSize = `${Math.max(11, Math.round(13 * scale))}px`

  const pitchColor = '#805ad5'
  const rollColor  = '#dd6b20'
  const needleRotation = (angle) => angle

  const Gauge = ({ label, value, color }) => (
    <VStack
      spacing="0.25rem"
      align="center"
      justify="center"
      w="100%"
      /* allow each gauge to grow/shrink evenly */
      flex="1"
      overflow="visible"           // was "hidden"
    >
      <HStack spacing="0.4rem" justify="center" align="center">
        <Text fontSize={labelSize} fontWeight="medium">{label}</Text>
        <Text fontSize={valueSize} color="gray.600" fontWeight="semibold">{value.toFixed(0)}°</Text>
      </HStack>
      <Box
        w={`${gaugeSize}px`}
        h={`${gaugeSize}px`}
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="visible"         // was "hidden"
      >
        {/* use an explicit px size so the progress circle fits exact layout and doesn't get clipped */}
        <CircularProgress
          value={toPct(value)}
          size={`${gaugeSize}px`}
          color={color}
          thickness={thickness}
          capIsRound
        />
        <Box
          as="span"
          position="absolute"
          left={`${needleLeftPct}%`}
          top="50%"
          width={`${needleWidthPct}%`}
          height={needleHeight}
          bg={color}
          transform={`translateY(-50%) rotate(${needleRotation(value)}deg)`}
          transformOrigin="50% 50%"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -50%)"
          width={centerCap}
          height={centerCap}
          bg={color}
          pointerEvents="none"
        />
      </Box>
    </VStack>
  )

  return (
    <VStack
      ref={containerRef}
      spacing={{ base: '0.6rem', md: '0.75rem' }}
      p={{ base: 2, md: 3 }}
      bg="white"
      /* fill available height from parent and allow internal layout to size correctly */
      h="90%"
      minH="0"
      w="100%"
      maxW="100%"
      flex="0 1 auto"
      align="stretch"
      justify="center"
      overflow="visible"
    >
      <Gauge label="Pitch" value={pitch} color={pitchColor} />
      <Gauge label="Roll"  value={roll}  color={rollColor} />
    </VStack>
  )
}