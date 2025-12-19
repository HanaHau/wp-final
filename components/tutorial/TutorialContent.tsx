'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ArrowRight, ListChecks, Plus } from 'lucide-react'
import Image from 'next/image'

interface Pet {
  name: string
  imageUrl: string | null
  facingDirection: string | null
}

interface TutorialContentProps {
  pet: Pet | null
}

interface TutorialStep {
  id: string
  title: string
  content: string[]
  highlight?: 'tracking' | 'points' | 'mood' | 'fullness' | 'friends' | 'missions'
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome!',
    content: [
      "Hi! Welcome to your personal expense tracker!",
      "I'm here to help you build better money habits.",
      "Let me show you how this app works!"
    ],
  },
  {
    id: 'tracking',
    title: 'Track Your Money',
    content: [
      "The core of this app is expense tracking.",
      "Record every expense and income you make.",
      "Categorize them to understand where your money goes!",
      "Check the Statistics page for insights and reports."
    ],
    highlight: 'tracking'
  },
  {
    id: 'missions',
    title: 'Complete Missions',
    content: [
      "This is how you earn points!",
      "Complete missions like: record a transaction, visit friends, or pet their companions.",
      "Once a mission is done, click 'Claim' to get your points!",
      "Weekly missions offer bigger rewards!"
    ],
    highlight: 'missions'
  },
  {
    id: 'points',
    title: 'Your Rewards',
    content: [
      "Daily: Record 1 transaction (+10 pts), Visit friend (+5 pts), Pet friend's pet (+5 pts).",
      "Weekly: Track 5 days (+40 pts), Interact with 3 friends (+30 pts).",
      "Bonus: Login 5 days in a row for +20 pts!",
      "Use points in the Shop to buy food and decorations!"
    ],
    highlight: 'points'
  },
  {
    id: 'pet-care',
    title: 'Your Companion',
    content: [
      "I'm your companion on this journey!",
      "My mood and fullness decrease over time.",
      "Feed me with food you buy using your earned points!",
      "The more consistently you track expenses, the happier I'll be!"
    ],
    highlight: 'mood'
  },
  {
    id: 'fullness',
    title: 'Keep Me Fed',
    content: [
      "Use your points to buy food from the shop!",
      "When you feed me, my fullness increases.",
      "If my mood or fullness reaches 0... I won't survive!",
      "Please take good care of me~"
    ],
    highlight: 'fullness'
  },
  {
    id: 'friends',
    title: 'Track Together',
    content: [
      "Add friends who also want to build better habits!",
      "Visit their pets and interact with them.",
      "This also helps you complete missions!",
      "Stay accountable together!"
    ],
    highlight: 'friends'
  },
  {
    id: 'ready',
    title: "Start Tracking!",
    content: [
      "You're all set!",
      "Remember: track expenses → complete missions → claim points!",
      "Use points to keep me happy and healthy.",
      "Let's achieve your financial goals together!"
    ],
  },
]

export default function TutorialContent({ pet }: TutorialContentProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [petAnimation, setPetAnimation] = useState<'idle' | 'bounce' | 'wave' | 'happy'>('idle')
  const [isCompleting, setIsCompleting] = useState(false)

  const step = TUTORIAL_STEPS[currentStep]
  const petName = pet?.name || 'Your Pet'
  const petImage = pet?.imageUrl || '/cat.png'
  const facingDirection = pet?.facingDirection || 'right'

  // Typewriter effect for speech bubbles
  useEffect(() => {
    setDisplayedLines([])
    setCurrentLineIndex(0)
    setIsTyping(true)
    setPetAnimation('bounce')
    
    const timer = setTimeout(() => {
      setPetAnimation('idle')
    }, 500)
    
    return () => clearTimeout(timer)
  }, [currentStep])

  useEffect(() => {
    if (currentLineIndex < step.content.length) {
      const timer = setTimeout(() => {
        setDisplayedLines(prev => [...prev, step.content[currentLineIndex]])
        setCurrentLineIndex(prev => prev + 1)
        setPetAnimation('wave')
        setTimeout(() => setPetAnimation('idle'), 300)
      }, currentLineIndex === 0 ? 300 : 600)
      
      return () => clearTimeout(timer)
    } else {
      setIsTyping(false)
    }
  }, [currentLineIndex, step.content])

  // Random pet animations
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTyping && Math.random() > 0.7) {
        setPetAnimation('happy')
        setTimeout(() => setPetAnimation('idle'), 600)
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [isTyping])

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    setCurrentStep(TUTORIAL_STEPS.length - 1)
  }, [])

  const handleComplete = async () => {
    setIsCompleting(true)
    setPetAnimation('happy')
    
    try {
      const res = await fetch('/api/tutorial/complete', {
        method: 'POST',
      })
      
      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 800))
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to complete tutorial:', error)
      router.push('/dashboard')
    }
  }

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  // Render stat card exactly like dashboard (min-w-[220px] to match)
  const renderStatCard = (label: string, value: number) => {
    const normalized = Math.min(Math.max(value, 0), 100)
    const isWarning = normalized < 20
    const color = isWarning ? '#dc2626' : normalized < 30 ? '#c0392b' : normalized < 50 ? '#f39c12' : '#0f172a'
    
    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-xl border ${isWarning ? 'border-red-500' : 'border-black/20'} px-4 py-2 min-w-[220px] shadow-sm`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs uppercase tracking-wide ${isWarning ? 'text-red-600 font-bold' : 'text-black/60'}`}>
            {label} {isWarning && '⚠️ Warning'}
          </span>
          <span className={`text-lg font-bold ${isWarning ? 'text-red-600' : 'text-black'}`}>{normalized}%</span>
        </div>
        <div
          className={`relative w-full h-4 rounded-lg border ${isWarning ? 'border-red-500' : 'border-black/20'} overflow-hidden`}
          style={{
            backgroundImage: isWarning 
              ? 'repeating-linear-gradient(135deg, rgba(220,38,38,0.15) 0 6px, transparent 6px 12px)'
              : 'repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0 6px, transparent 6px 12px)',
          }}
        >
          <div
            className="absolute inset-y-0 left-0 h-full transition-[width] duration-500"
            style={{
              width: `${normalized}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    )
  }

  // Render points card exactly like dashboard
  const renderPointsCard = (points: number) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-black/20 px-3 py-2 shadow-sm">
      <div className="text-xs text-black/60 uppercase tracking-wide">Points</div>
      <div className="text-lg font-bold text-black">{points}</div>
    </div>
  )

  // Render balance card exactly like dashboard
  const renderBalanceCard = (balance: number) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-black/20 px-3 py-2 shadow-sm">
      <div className="text-xs text-black/60 uppercase tracking-wide">Balance</div>
      <div className={`text-lg font-bold ${balance < 0 ? 'text-red-600' : 'text-black'}`}>
        ${balance.toLocaleString()}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-6 px-4">
        <h1 className="text-2xl font-bold text-black uppercase tracking-wide">Pet Expense Tracker</h1>
        <p className="text-sm text-black/50 mt-1">Your smart companion for building better money habits</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6 px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-black/60 uppercase tracking-wide">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </span>
          {currentStep < TUTORIAL_STEPS.length - 1 && (
            <button
              onClick={handleSkip}
              className="text-xs text-black/40 hover:text-black/60 transition-colors uppercase tracking-wide"
            >
              Skip Tutorial
            </button>
          )}
        </div>
        <div className="h-2 bg-black/10 rounded-full overflow-hidden border border-black/20">
          <div
            className="h-full bg-black rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content card */}
      <div className="w-full max-w-lg relative">
        {/* Pet character */}
        <div className="flex justify-center mb-4 relative">
          <div
            className={`relative transition-all duration-300 ${
              petAnimation === 'bounce' ? 'animate-pet-bounce' :
              petAnimation === 'wave' ? 'animate-pet-wave' :
              petAnimation === 'happy' ? 'animate-pet-happy' :
              'animate-pet-idle'
            }`}
          >
            {/* Pet shadow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/10 rounded-full blur-sm" />
            
            {/* Pet image container */}
            <div 
              className="relative w-28 h-28 md:w-36 md:h-36"
              style={{
                transform: facingDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
              }}
            >
              <Image
                src={petImage}
                alt={petName}
                fill
                className="object-contain"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                priority
              />
            </div>
          </div>
        </div>

        {/* Speech bubble */}
        <div className="bg-white rounded-2xl border-2 border-black p-6 relative shadow-sm">
          {/* Speech bubble tail */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="w-5 h-5 bg-white border-l-2 border-t-2 border-black transform rotate-45" />
          </div>

          {/* Step title */}
          <div className="mb-4 pb-3 border-b border-black/10">
            <h2 className="text-xl font-bold text-black uppercase tracking-wide">{step.title}</h2>
            <p className="text-xs text-black/50 mt-1">{petName} is here to guide you</p>
          </div>

          {/* Speech content with typewriter effect */}
          <div className="space-y-2 min-h-[100px]">
            {displayedLines.map((line, index) => (
              <p
                key={index}
                className="text-black/80 leading-relaxed animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {line}
              </p>
            ))}
            {isTyping && (
              <div className="flex gap-1 pt-2">
                <span className="w-2 h-2 bg-black/30 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-black/30 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-black/30 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            )}
          </div>

          {/* Feature highlight - exactly like dashboard */}
          {step.highlight && !isTyping && (
            <div className="mt-4 pt-4 border-t border-black/10 animate-fade-in">
              {step.highlight === 'tracking' && (
                <div className="flex flex-wrap items-center gap-3">
                  {renderBalanceCard(1250)}
                  {/* Add transaction button - exactly like dashboard */}
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-black/60 uppercase tracking-wide">Add Record</span>
                  </div>
                </div>
              )}
              {step.highlight === 'points' && (
                <div className="flex flex-wrap gap-3">
                  {renderPointsCard(150)}
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-black/20 p-3 shadow-sm flex-1">
                    <div className="text-xs text-black/60 uppercase tracking-wide mb-2">Rewards</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between"><span>Record transaction</span><span className="font-bold">+10</span></div>
                      <div className="flex justify-between"><span>Visit friend</span><span className="font-bold">+5</span></div>
                      <div className="flex justify-between"><span>Pet friend&apos;s pet</span><span className="font-bold">+5</span></div>
                      <div className="flex justify-between"><span>5-day login</span><span className="font-bold">+20</span></div>
                    </div>
                  </div>
                </div>
              )}
              {step.highlight === 'mood' && (
                <div className="flex flex-wrap gap-3">
                  {renderStatCard('Mood', 75)}
                  {renderStatCard('Fullness', 60)}
                </div>
              )}
              {step.highlight === 'fullness' && (
                <div className="flex flex-wrap gap-3">
                  {renderStatCard('Fullness', 50)}
                </div>
              )}
              {step.highlight === 'missions' && (
                <div className="flex items-start gap-3">
                  {/* Missions button - exactly like dashboard */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-black/20 w-12 h-12 flex items-center justify-center shadow-sm relative">
                    <ListChecks className="h-5 w-5 text-black" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full" />
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-black/20 p-3 shadow-sm flex-1">
                    <div className="text-xs text-black/60 uppercase tracking-wide mb-2">Mission Example</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-black">Record 1 transaction</span>
                          <span className="text-xs text-green-600">✓ Done</span>
                        </div>
                        <button className="text-xs px-3 py-1 bg-black text-white rounded font-medium">
                          Claim +10
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-black/50">Visit 1 friend</span>
                          <span className="text-xs text-black/40">0/1</span>
                        </div>
                        <span className="text-xs px-3 py-1 bg-black/10 text-black/40 rounded">+5 pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {step.highlight === 'friends' && (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-black/20 p-3 shadow-sm">
                  <div className="text-xs text-black/60 uppercase tracking-wide mb-2">Friends</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 bg-black/10 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-bold text-black/60">A</span>
                      </div>
                      <div className="w-8 h-8 bg-black/10 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-bold text-black/60">B</span>
                      </div>
                      <div className="w-8 h-8 bg-black/10 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-bold text-black/60">C</span>
                      </div>
                    </div>
                    <span className="text-sm text-black/60">Visit &amp; interact!</span>
                  </div>
                  <div className="text-xs text-black/50">
                    Visiting and petting friends&apos; pets completes missions!
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6 px-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0 || isCompleting}
            className="gap-2 border-2 border-black/20 hover:border-black hover:bg-black/5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={isTyping || isCompleting}
              className="gap-2 bg-black hover:bg-black/80 text-white border-2 border-black px-8"
            >
              {isCompleting ? (
                'Starting...'
              ) : (
                <>
                  Let&apos;s Go!
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isTyping || isCompleting}
              className="gap-2 bg-black hover:bg-black/80 text-white border-2 border-black"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => !isCompleting && setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 border ${
                index === currentStep
                  ? 'w-6 bg-black border-black'
                  : index < currentStep
                  ? 'w-2 bg-black/40 border-black/40'
                  : 'w-2 bg-transparent border-black/20'
              }`}
              disabled={isCompleting}
            />
          ))}
        </div>
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        @keyframes pet-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pet-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        
        @keyframes pet-happy {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes pet-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        
        .animate-pet-bounce {
          animation: pet-bounce 0.5s ease-in-out;
        }
        
        .animate-pet-wave {
          animation: pet-wave 0.3s ease-in-out;
        }
        
        .animate-pet-happy {
          animation: pet-happy 0.6s ease-in-out infinite;
        }
        
        .animate-pet-idle {
          animation: pet-idle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
