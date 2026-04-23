import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: workspaceId } = params
  const { userMessage, mentionIds } = await req.json()

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { modelRuns: true },
  })

  if (!workspace) {
    return Response.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Determine target runs
  const targetRuns = mentionIds && mentionIds.length > 0
    ? workspace.modelRuns.filter((r: any) => mentionIds.includes(r.id))
    : workspace.modelRuns

  if (targetRuns.length === 0) {
    return Response.json({ error: 'No runs selected' }, { status: 400 })
  }

  // Intent Recognition
  const intentPrompt = `
You are an intent recognition engine. The user is in an AI workspace with several AI-generated cards and a final draft area.
User's message: "${userMessage}"
Did the user mention specific cards? ${mentionIds?.length > 0 ? 'Yes' : 'No'}

Determine if the user wants to:
1. "update_cards": Modify, refine, or rewrite the content of the AI cards themselves (e.g., "make this shorter", "rewrite this in a different tone", "add more details to your answer").
2. "final_draft": Generate a final combined output, summary, comparison, or new artifact based on the cards (e.g., "summarize these into a table", "what is the consensus", "write an article based on this").

Respond with ONLY a JSON object: {"intent": "update_cards" | "final_draft"}
`

  try {
    const intentRes = await chatOnce({
      model: 'deepseek-v3-2-251201', // Using an available model
      messages: [{ role: 'user', content: intentPrompt }],
      provider: 'qiniu' // Using the default provider
    })
    
    let intent = 'final_draft'
    try {
      const parsed = JSON.parse(intentRes.replace(/```json/g, '').replace(/```/g, '').trim())
      if (parsed.intent === 'update_cards') intent = 'update_cards'
    } catch {
      console.error('Intent parse error, defaulting to final_draft')
    }

    if (intent === 'update_cards') {
      // Update DB to queue the target runs again with new instructions
      // Since we don't have chat history in DB, we'll prepend the instruction to the workspace prompt?
      // No, that affects all. Let's just create a new hidden mechanism or just append to the run's error field? No.
      // We can't easily store per-run history in the current schema.
      // Let's just return the intent to the frontend, and let the frontend handle it or we update the DB here.
      // Actually, if we update the DB here, we can set status to 'queued' and we need a way to pass the new instruction.
      // We could temporarily store the instruction in the `error` field? Hacky.
      // How about we just update the Workspace prompt to include the new instruction for ALL?
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { prompt: workspace.prompt + `\n\n[后续补充指令]: ${userMessage}` }
      })
      
      // Queue the target runs
      await prisma.modelRun.updateMany({
        where: { id: { in: targetRuns.map((r: any) => r.id) } },
        data: { status: 'queued', content: '' }
      })
      
      return Response.json({ intent: 'update_cards' })
    } else {
      // It's a final draft. We need to stream it.
      // Since Next.js API routes can return a stream directly, we could return a stream here.
      // BUT our frontend `handleChatSubmit` is currently expecting JSON!
      // If we return JSON `{ intent: 'final_draft' }`, the frontend can then call a generate endpoint?
      // Yes, let's create a temporary SceneSession and return its ID so frontend can redirect or stream it!
      const session = await prisma.sceneSession.create({
        data: {
          workspaceId,
          sceneType: 'chat',
          userSelections: JSON.stringify(targetRuns.map((r: any) => r.id)),
        }
      })
      return Response.json({ intent: 'final_draft', sessionId: session.id })
    }
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
