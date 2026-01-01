import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-sm">
        <Card className="border-zinc-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">회원가입 완료!</CardTitle>
            <CardDescription className="text-zinc-500">이메일을 확인해주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600">
              회원가입이 완료되었습니다. 이메일에서 인증 링크를 클릭하여 계정을 활성화해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
