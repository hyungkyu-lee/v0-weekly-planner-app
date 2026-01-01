import { Button } from "@/components/ui/button"
import { Calendar, Check, Star, Clock } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm mb-8">
            <Calendar className="h-4 w-4 text-zinc-600" />
            <span className="text-sm font-medium text-zinc-700">여러 디바이스에서 동기화되는 플래너</span>
          </div>

          <h1 className="text-6xl font-bold tracking-tight text-zinc-900 mb-6">나만의 주간 플래너</h1>
          <p className="text-xl text-zinc-600 mb-12 leading-relaxed">
            Apple 스타일의 깔끔한 디자인으로 일정을 관리하세요.
            <br />
            모든 디바이스에서 실시간으로 동기화됩니다.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full text-base px-8">
              <Link href="/auth/sign-up">시작하기</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full text-base px-8 bg-transparent">
              <Link href="/auth/login">로그인</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">시간 충돌 방지</h3>
            <p className="text-zinc-600">일정이 겹치지 않도록 자동으로 확인하고 알려드립니다.</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">실시간 동기화</h3>
            <p className="text-zinc-600">모든 디바이스에서 실시간으로 일정이 동기화됩니다.</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">중요 일정 표시</h3>
            <p className="text-zinc-600">중요한 일정을 별표로 표시하고 한눈에 확인하세요.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
