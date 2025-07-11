'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Upload, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react'
import { Toaster, toast } from 'sonner'

interface ParsedCard {
  quantity: number
  name: string
  set: string
  number: string
  originalLine: string
}

interface ParsedCSVCard {
  quantity: number
  name: string
  set: string
  number: string
  foil: boolean
  condition: string
  language: string
  originalLine: string
}

interface ImportLog {
  line: string
  status: 'pending' | 'success' | 'error'
  message?: string
}

export default function ImportCollectionPage() {
  const [moxfieldInput, setMoxfieldInput] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importLog, setImportLog] = useState<ImportLog[]>([])
  const [importSummary, setImportSummary] = useState<{ successful: number; failed: number } | null>(null)
  
  // Manabox CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isImportingCSV, setIsImportingCSV] = useState(false)
  const [csvImportLog, setCsvImportLog] = useState<ImportLog[]>([])
  const [csvImportSummary, setCsvImportSummary] = useState<{ successful: number; failed: number } | null>(null)
  
  const supabase = createClient()

  const parseMoxfieldInput = (input: string): ParsedCard[] => {
    const lines = input.trim().split('\n')
    const regex = /^(\d+)\s+(.+?)\s+\(([^)]+)\)\s+([\w\d-]+)$/

    return lines
      .map(line => {
        const match = line.trim().match(regex)
        if (!match) return null

        return {
          quantity: parseInt(match[1], 10),
          name: match[2].trim(),
          set: match[3].trim().toLowerCase(),
          number: match[4].trim(),
          originalLine: line,
        }
      })
      .filter((card): card is ParsedCard => card !== null)
  }

  const parseCSVContent = (csvContent: string): ParsedCSVCard[] => {
    const lines = csvContent.trim().split('\n')
    const headers = lines[0].split(',') // Comma-separated values
    
    if (lines.length < 2) return []
    
    // Expected headers based on your sample: Name, Set code, Set name, Collector number, Foil, Rarity, Quantity, etc.
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'))
    const setIndex = headers.findIndex(h => h.toLowerCase().includes('set code'))
    const numberIndex = headers.findIndex(h => h.toLowerCase().includes('collector number'))
    const foilIndex = headers.findIndex(h => h.toLowerCase().includes('foil'))
    const quantityIndex = headers.findIndex(h => h.toLowerCase().includes('quantity'))
    const conditionIndex = headers.findIndex(h => h.toLowerCase().includes('condition'))
    const languageIndex = headers.findIndex(h => h.toLowerCase().includes('language'))

    return lines.slice(1)
      .map(line => {
        const columns = line.split(',')
        
        if (columns.length < Math.max(nameIndex, setIndex, quantityIndex) + 1) return null

        const quantity = parseInt(columns[quantityIndex] || '1', 10)
        if (isNaN(quantity) || quantity <= 0) return null

        const foilValue = (columns[foilIndex] || '').toLowerCase() || 'normal'
        const isFoil = Boolean(foilValue === 'foil' || foilValue === 'true')
        
        let condition: string = columns[conditionIndex]?.toLowerCase() || 'near_mint'
        // Map common condition values to our system
        if (condition.includes('mint') || condition === 'nm') condition = 'near_mint'
        else if (condition.includes('light') || condition === 'lp') condition = 'lightly_played'
        else if (condition.includes('played') || condition === 'mp') condition = 'moderately_played'
        else if (condition.includes('heavy') || condition === 'hp') condition = 'heavily_played'
        else if (condition.includes('damaged') || condition === 'dmg') condition = 'damaged'
        else condition = 'near_mint' // default

        let language: string = columns[languageIndex]?.toLowerCase() || 'english'
        // Map common language values
        if (language === 'en' || language.includes('english')) language = 'english'
        else if (language === 'es' || language.includes('spanish')) language = 'spanish'
        else if (language === 'fr' || language.includes('french')) language = 'french'
        else if (language === 'de' || language.includes('german')) language = 'german'
        else if (language === 'it' || language.includes('italian')) language = 'italian'
        else if (language === 'pt' || language.includes('portuguese')) language = 'portuguese'
        else if (language === 'ja' || language.includes('japanese')) language = 'japanese'
        else if (language === 'ko' || language.includes('korean')) language = 'korean'
        else if (language === 'ru' || language.includes('russian')) language = 'russian'
        else if (language === 'zh' || language.includes('chinese')) language = 'chinese_simplified'
        else language = 'english' // default

        return {
          quantity,
          name: columns[nameIndex]?.trim() || '',
          set: columns[setIndex]?.trim().toLowerCase() || '',
          number: columns[numberIndex]?.trim() || '',
          foil: isFoil,
          condition: condition,
          language: language,
          originalLine: line,
        } as ParsedCSVCard
      })
      .filter((card): card is ParsedCSVCard => card !== null && card.name && card.set)
  }

  const handleMoxfieldImport = async () => {
    if (!moxfieldInput.trim()) {
      toast.error('Please paste your collection data into the text box.')
      return
    }

    setIsImporting(true)
    setImportLog([])
    setImportSummary(null)

    const parsedCards = parseMoxfieldInput(moxfieldInput)

    if (parsedCards.length === 0) {
      toast.error('Could not parse any cards. Please check the format.')
      setIsImporting(false)
      return
    }

    setImportLog(parsedCards.map(card => ({ line: card.originalLine, status: 'pending' })))
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be logged in to import cards.')
      setIsImporting(false)
      return
    }
    
    // Get or create default container
    let containerId: string;
    const { data: container, error: containerError } = await supabase
      .from('containers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single()

    if (containerError && containerError.code !== 'PGRST116') {
      toast.error(`Failed to get default container: ${containerError.message}`)
      setIsImporting(false)
      return
    }
    
    if (container) {
        containerId = container.id
    } else {
        const { data: newContainer, error: createError } = await supabase
          .from('containers')
          .insert({ user_id: user.id, name: 'Unorganized Cards', container_type: 'custom', is_default: true })
          .select('id')
          .single()

        if (createError) {
          toast.error(`Failed to create default container: ${createError.message}`)
          setIsImporting(false)
          return
        }
        containerId = newContainer.id
    }

    let successfulImports = 0
    let failedImports = 0

    for (const [index, card] of parsedCards.entries()) {
      try {
        // Find card in default_cards
        const { data: foundCard, error: findError } = await supabase
          .from('default_cards')
          .select('id, name')
          .ilike('name', card.name)
          .eq('set', card.set)
          .limit(1)
          .single()

        if (findError || !foundCard) {
          throw new Error(`Card not found in database`)
        }
        
        // Try to insert the new card
        const { data: newUserCard, error: insertError } = await supabase
          .from('user_cards')
          .insert({
            card_id: foundCard.id,
            user_id: user.id,
            quantity: card.quantity,
            condition: 'near_mint', // Default condition
            foil: false,
            language: 'english',
          })
          .select('id')
          .single()

        if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation -> card exists
                const { error: rpcError } = await supabase.rpc('increment_card_quantity', {
                    p_card_id: foundCard.id,
                    p_user_id: user.id,
                    p_condition: 'near_mint',
                    p_foil: false,
                    p_language: 'english',
                    p_quantity_to_add: card.quantity
                })
                if (rpcError) throw new Error(`Failed to update quantity: ${rpcError.message}`);
            } else { // Another type of insert error
                 throw insertError;
            }
        } else {
            // If insert was successful, add it to the default container
            const { error: containerItemError } = await supabase
            .from('container_items')
            .insert({
                user_card_id: newUserCard.id,
                container_id: containerId,
                quantity: card.quantity,
            });
            if (containerItemError) throw new Error(`Failed to add to container: ${containerItemError.message}`)
        }
        
        // If we reach here, the operation was a success
        successfulImports++;
        setImportLog(prev => {
          const newLog = [...prev]
          newLog[index] = { ...newLog[index], status: 'success' }
          return newLog
        })

      } catch (error) {
        const e = error as Error
        failedImports++;
        setImportLog(prev => {
          const newLog = [...prev]
          newLog[index] = { ...newLog[index], status: 'error', message: e.message }
          return newLog
        })
      }
    }

    setImportSummary({ successful: successfulImports, failed: failedImports })
    toast.info(`Import complete: ${successfulImports} successful, ${failedImports} failed.`)
    setIsImporting(false)
  }

  const handleCSVImport = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file to import.')
      return
    }

    setIsImportingCSV(true)
    setCsvImportLog([])
    setCsvImportSummary(null)

    try {
      const csvContent = await csvFile.text()
      const parsedCards = parseCSVContent(csvContent)

      if (parsedCards.length === 0) {
        toast.error('Could not parse any cards from the CSV file. Please check the format.')
        setIsImportingCSV(false)
        return
      }

      setCsvImportLog(parsedCards.map(card => ({ line: `${card.quantity}x ${card.name} (${card.set.toUpperCase()})`, status: 'pending' })))
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to import cards.')
        setIsImportingCSV(false)
        return
      }
      
      // Get or create default container
      let containerId: string;
      const { data: container, error: containerError } = await supabase
        .from('containers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()

      if (containerError && containerError.code !== 'PGRST116') {
        toast.error(`Failed to get default container: ${containerError.message}`)
        setIsImportingCSV(false)
        return
      }
      
      if (container) {
          containerId = container.id
      } else {
          const { data: newContainer, error: createError } = await supabase
            .from('containers')
            .insert({ user_id: user.id, name: 'Unorganized Cards', container_type: 'custom', is_default: true })
            .select('id')
            .single()

          if (createError) {
            toast.error(`Failed to create default container: ${createError.message}`)
            setIsImportingCSV(false)
            return
          }
          containerId = newContainer.id
      }

      let successfulImports = 0
      let failedImports = 0

      for (const [index, card] of parsedCards.entries()) {
        try {
          // Find card in default_cards
          const { data: foundCard, error: findError } = await supabase
            .from('default_cards')
            .select('id, name')
            .ilike('name', card.name)
            .eq('set', card.set)
            .limit(1)
            .single()

          if (findError || !foundCard) {
            throw new Error(`Card not found in database`)
          }
          
          // Try to insert the new card
          const { data: newUserCard, error: insertError } = await supabase
            .from('user_cards')
            .insert({
              card_id: foundCard.id,
              user_id: user.id,
              quantity: card.quantity,
              condition: card.condition,
              foil: card.foil,
              language: card.language,
            })
            .select('id')
            .single()

          if (insertError) {
              if (insertError.code === '23505') { // Unique constraint violation -> card exists
                  const { error: rpcError } = await supabase.rpc('increment_card_quantity', {
                      p_card_id: foundCard.id,
                      p_user_id: user.id,
                      p_condition: card.condition,
                      p_foil: card.foil,
                      p_language: card.language,
                      p_quantity_to_add: card.quantity
                  })
                  if (rpcError) throw new Error(`Failed to update quantity: ${rpcError.message}`);
              } else { // Another type of insert error
                   throw insertError;
              }
          } else {
              // If insert was successful, add it to the default container
              const { error: containerItemError } = await supabase
              .from('container_items')
              .insert({
                  user_card_id: newUserCard.id,
                  container_id: containerId,
                  quantity: card.quantity,
              });
              if (containerItemError) throw new Error(`Failed to add to container: ${containerItemError.message}`)
          }
          
          // If we reach here, the operation was a success
          successfulImports++;
          setCsvImportLog(prev => {
            const newLog = [...prev]
            newLog[index] = { ...newLog[index], status: 'success' }
            return newLog
          })

        } catch (error) {
          const e = error as Error
          failedImports++;
          setCsvImportLog(prev => {
            const newLog = [...prev]
            newLog[index] = { ...newLog[index], status: 'error', message: e.message }
            return newLog
          })
        }
      }

      setCsvImportSummary({ successful: successfulImports, failed: failedImports })
      toast.info(`CSV Import complete: ${successfulImports} successful, ${failedImports} failed.`)
      setIsImportingCSV(false)

    } catch (error) {
      toast.error('Failed to read CSV file.')
      setIsImportingCSV(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setCsvImportLog([])
      setCsvImportSummary(null)
    } else {
      toast.error('Please select a valid CSV file.')
    }
  }

  return (
    <>
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/collection">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Import Collection</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Moxfield Import</CardTitle>
            <CardDescription>
              Paste your collection from Moxfield below. The format should be: Quantity Card Name (Set Code) Card Number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`1 Y'shtola, Night's Blessed (FIC) 7\n1 Cursed Land (4ED) 127\n1 Dregscape Zombie (DDN) 5...`}
              value={moxfieldInput}
              onChange={(e) => setMoxfieldInput(e.target.value)}
              rows={10}
              disabled={isImporting}
            />
            <Button onClick={handleMoxfieldImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import from Moxfield
                </>
              )}
            </Button>

            {importLog.length > 0 && (
              <div className="mt-4 p-4 border rounded-md max-h-72 overflow-y-auto space-y-2 bg-muted/50">
                {importSummary && (
                  <p className="font-bold text-lg mb-2 sticky top-0 bg-muted/50 py-2">
                    Import Complete: {importSummary.successful} successful, {importSummary.failed} failed.
                  </p>
                )}
                <ul className="space-y-1">
                  {importLog.map((log, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-2">
                        {log.status === 'success' && <CheckCircle2 className="text-green-500" />}
                        {log.status === 'error' && <XCircle className="text-red-500" />}
                        {log.status === 'pending' && <Loader2 className="text-muted-foreground animate-spin" />}
                      </div>
                      <div className="flex-1">
                        <p className={log.status === 'error' ? 'text-red-500' : ''}>{log.line}</p>
                        {log.status === 'error' && log.message && (
                          <p className="text-xs text-red-600 pl-1">{log.message}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manabox CSV Import</CardTitle>
            <CardDescription>
              Import your collection from a Manabox CSV export. The CSV should include columns for Name, Set code, Quantity, Condition, Foil status, and Language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="csv-file" className="text-sm font-medium">
                Select CSV File
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImportingCSV}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              {csvFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            
            <Button onClick={handleCSVImport} disabled={isImportingCSV || !csvFile}>
              {isImportingCSV ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Import from CSV
                </>
              )}
            </Button>

            {csvImportLog.length > 0 && (
              <div className="mt-4 p-4 border rounded-md max-h-72 overflow-y-auto space-y-2 bg-muted/50">
                {csvImportSummary && (
                  <p className="font-bold text-lg mb-2 sticky top-0 bg-muted/50 py-2">
                    CSV Import Complete: {csvImportSummary.successful} successful, {csvImportSummary.failed} failed.
                  </p>
                )}
                <ul className="space-y-1">
                  {csvImportLog.map((log, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-2">
                        {log.status === 'success' && <CheckCircle2 className="text-green-500" />}
                        {log.status === 'error' && <XCircle className="text-red-500" />}
                        {log.status === 'pending' && <Loader2 className="text-muted-foreground animate-spin" />}
                      </div>
                      <div className="flex-1">
                        <p className={log.status === 'error' ? 'text-red-500' : ''}>{log.line}</p>
                        {log.status === 'error' && log.message && (
                          <p className="text-xs text-red-600 pl-1">{log.message}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </>
  )
} 