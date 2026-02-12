import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob | null

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Forward to OpenAI Whisper API
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile, 'audio.webm')
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Whisper API error:', error)
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json({ text: result.text })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    )
  }
}
