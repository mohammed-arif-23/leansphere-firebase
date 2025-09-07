"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Search, AlertTriangle, CheckCircle, FileText, Globe, Users } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface PlagiarismMatch {
  id: string;
  source: string;
  sourceType: 'web' | 'database' | 'student_submission';
  similarity: number;
  matchedText: string;
  sourceText: string;
  url?: string;
  studentId?: string;
  submissionId?: string;
}

interface PlagiarismResult {
  overallSimilarity: number;
  matches: PlagiarismMatch[];
  riskLevel: 'low' | 'medium' | 'high';
  wordCount: number;
  uniqueWords: number;
  analysisTime: number;
}

interface PlagiarismDetectorProps {
  assignmentId: string;
  studentId: string;
  submissionText: string;
  onAnalysisComplete: (result: PlagiarismResult) => void;
  autoAnalyze?: boolean;
}

export default function PlagiarismDetector({
  assignmentId,
  studentId,
  submissionText,
  onAnalysisComplete,
  autoAnalyze = false
}: PlagiarismDetectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const { trackEvent } = useAnalytics();

  // Text preprocessing utilities
  const preprocessText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const generateNGrams = (text: string, n: number): string[] => {
    const words = preprocessText(text).split(' ');
    const ngrams: string[] = [];
    
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  };

  const calculateSimilarity = (text1: string, text2: string): number => {
    const ngrams1 = new Set(generateNGrams(text1, 3));
    const ngrams2 = new Set(generateNGrams(text2, 3));
    
    const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
    const union = new Set([...ngrams1, ...ngrams2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  };

  const findCommonPhrases = (text1: string, text2: string, minLength: number = 5): string[] => {
    const words1 = preprocessText(text1).split(' ');
    const words2 = preprocessText(text2).split(' ');
    const commonPhrases: string[] = [];
    
    for (let i = 0; i < words1.length - minLength + 1; i++) {
      for (let len = minLength; len <= Math.min(20, words1.length - i); len++) {
        const phrase = words1.slice(i, i + len).join(' ');
        const text2Lower = preprocessText(text2);
        
        if (text2Lower.includes(phrase)) {
          commonPhrases.push(words1.slice(i, i + len).join(' '));
        }
      }
    }
    
    return commonPhrases.sort((a, b) => b.length - a.length).slice(0, 5);
  };

  // Mock database of previous submissions
  const mockStudentDatabase = [
    {
      id: 'sub1',
      studentId: 'student123',
      text: 'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.',
      assignmentId: 'assign1'
    },
    {
      id: 'sub2', 
      studentId: 'student456',
      text: 'Deep learning uses neural networks with multiple layers to model and understand complex patterns.',
      assignmentId: 'assign1'
    }
  ];

  // Mock web sources
  const mockWebSources = [
    {
      url: 'https://en.wikipedia.org/wiki/Machine_learning',
      text: 'Machine learning is a method of data analysis that automates analytical model building using algorithms.',
      title: 'Machine Learning - Wikipedia'
    },
    {
      url: 'https://www.ibm.com/topics/machine-learning',
      text: 'Machine learning is a branch of artificial intelligence focused on building applications that learn from data.',
      title: 'What is Machine Learning? - IBM'
    }
  ];

  const analyzeForPlagiarism = async (): Promise<PlagiarismResult> => {
    const startTime = Date.now();
    const matches: PlagiarismMatch[] = [];
    
    setCurrentStep('Preprocessing text...');
    setProgress(10);
    
    const wordCount = submissionText.split(/\s+/).length;
    const uniqueWords = new Set(preprocessText(submissionText).split(' ')).size;
    
    // Check against student database
    setCurrentStep('Checking against student submissions...');
    setProgress(30);
    
    for (const submission of mockStudentDatabase) {
      if (submission.studentId !== studentId) {
        const similarity = calculateSimilarity(submissionText, submission.text);
        
        if (similarity > 0.3) {
          const commonPhrases = findCommonPhrases(submissionText, submission.text);
          
          matches.push({
            id: `student-${submission.id}`,
            source: `Student submission by ${submission.studentId}`,
            sourceType: 'student_submission',
            similarity: Math.round(similarity * 100),
            matchedText: commonPhrases[0] || '',
            sourceText: submission.text.substring(0, 200) + '...',
            studentId: submission.studentId,
            submissionId: submission.id
          });
        }
      }
    }
    
    // Check against web sources
    setCurrentStep('Checking against web sources...');
    setProgress(60);
    
    for (const source of mockWebSources) {
      const similarity = calculateSimilarity(submissionText, source.text);
      
      if (similarity > 0.2) {
        const commonPhrases = findCommonPhrases(submissionText, source.text);
        
        matches.push({
          id: `web-${source.url}`,
          source: source.title,
          sourceType: 'web',
          similarity: Math.round(similarity * 100),
          matchedText: commonPhrases[0] || '',
          sourceText: source.text.substring(0, 200) + '...',
          url: source.url
        });
      }
    }
    
    setCurrentStep('Finalizing analysis...');
    setProgress(90);
    
    // Calculate overall similarity
    const overallSimilarity = matches.length > 0 
      ? Math.max(...matches.map(m => m.similarity))
      : 0;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (overallSimilarity > 70) riskLevel = 'high';
    else if (overallSimilarity > 40) riskLevel = 'medium';
    
    setProgress(100);
    
    return {
      overallSimilarity,
      matches: matches.sort((a, b) => b.similarity - a.similarity),
      riskLevel,
      wordCount,
      uniqueWords,
      analysisTime: Date.now() - startTime
    };
  };

  const startAnalysis = async () => {
    if (!submissionText.trim()) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    setResult(null);
    
    try {
      trackEvent('plagiarism_analysis_started', {
        assignmentId,
        studentId,
        textLength: submissionText.length
      });
      
      const analysisResult = await analyzeForPlagiarism();
      setResult(analysisResult);
      onAnalysisComplete(analysisResult);
      
      trackEvent('plagiarism_analysis_completed', {
        assignmentId,
        studentId,
        overallSimilarity: analysisResult.overallSimilarity,
        riskLevel: analysisResult.riskLevel,
        matchCount: analysisResult.matches.length,
        analysisTime: analysisResult.analysisTime
      });
      
    } catch (error) {
      console.error('Plagiarism analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setCurrentStep('');
      setProgress(0);
    }
  };

  useEffect(() => {
    if (autoAnalyze && submissionText.trim() && !result && !isAnalyzing) {
      startAnalysis();
    }
  }, [autoAnalyze, submissionText]);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'web': return <Globe className="h-4 w-4" />;
      case 'student_submission': return <Users className="h-4 w-4" />;
      case 'database': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Plagiarism Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!autoAnalyze && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Submission Text</label>
              <Textarea
                value={submissionText}
                readOnly
                className="min-h-32"
                placeholder="No submission text provided"
              />
            </div>
          )}
          
          {!result && !isAnalyzing && (
            <Button 
              onClick={startAnalysis} 
              disabled={!submissionText.trim()}
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Analyze for Plagiarism
            </Button>
          )}
          
          {isAnalyzing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Analyzing...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
              <div className="text-xs text-muted-foreground">{currentStep}</div>
            </div>
          )}
          
          {result && (
            <div className="space-y-4">
              {/* Overall Results */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">{result.overallSimilarity}%</div>
                      <div className="text-sm text-muted-foreground">Overall Similarity</div>
                      <Badge variant={getRiskColor(result.riskLevel)} className="mt-2">
                        {result.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Word Count:</span>
                        <span>{result.wordCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unique Words:</span>
                        <span>{result.uniqueWords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Matches Found:</span>
                        <span>{result.matches.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Analysis Time:</span>
                        <span>{(result.analysisTime / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Risk Assessment */}
              {result.riskLevel === 'high' && (
                <Alert className="border-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    High similarity detected. This submission requires manual review for potential plagiarism.
                  </AlertDescription>
                </Alert>
              )}
              
              {result.riskLevel === 'medium' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Moderate similarity detected. Consider reviewing the highlighted matches.
                  </AlertDescription>
                </Alert>
              )}
              
              {result.riskLevel === 'low' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Low similarity detected. This submission appears to be original.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Detailed Matches */}
              {result.matches.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Similarity Matches</h4>
                  {result.matches.map((match) => (
                    <Card key={match.id} className="border-l-4 border-l-orange-400">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSourceIcon(match.sourceType)}
                            <span className="font-medium text-sm">{match.source}</span>
                          </div>
                          <Badge variant="outline">{match.similarity}% similar</Badge>
                        </div>
                        
                        {match.matchedText && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">Matched Text:</div>
                            <div className="text-sm bg-yellow-100 p-2 rounded border-l-2 border-yellow-400">
                              "{match.matchedText}"
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          <div>Source: {match.sourceText}</div>
                          {match.url && (
                            <div className="mt-1">
                              <a href={match.url} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:underline">
                                View Source
                              </a>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
