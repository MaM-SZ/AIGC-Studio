import { useEffect, useState, FC } from 'react'

interface IProps {
  onDone: () => void
}

const CountDown: FC<IProps> = ({ onDone }) => {
  const [countdownNumber, setCountdownNumber] = useState(0)

  useEffect(() => {
    setCountdownNumber(3)

    const timer = setInterval(() => {
      setCountdownNumber((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(() => {
            onDone()
          }, 300)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (countdownNumber === 0) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          key={countdownNumber}
          className="text-9xl font-fredokaOne text-primary"
          style={{
            animation: 'countdown-scale 1s ease-out forwards'
          }}
        >
          {countdownNumber}
        </div>
      </div>

      <style>{`
        @keyframes countdown-scale {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}

export default CountDown
