'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  X, 
  RotateCcw, 
  AlertTriangle,
  Clock,
  User,
  MessageSquare
} from 'lucide-react';

interface ScenarioSimulationProps {
  scenario: {
    title: string;
    description: string;
    context: string;
    characters: Array<{
      id: string;
      name: string;
      role: string;
      avatar?: string;
    }>;
    scenes: Array<{
      id: string;
      type: 'narrative' | 'choice' | 'outcome';
      title: string;
      content: string;
      character?: string;
      choices?: Array<{
        id: string;
        text: string;
        consequence: string;
        nextScene?: string;
        points?: number;
        feedback?: string;
      }>;
      nextScene?: string;
      isEndScene?: boolean;
    }>;
    passingScore: number;
  };
  onComplete: (result: { score: number; path: string[]; feedback: string }) => void;
}

export function ScenarioSimulation({ scenario, onComplete }: ScenarioSimulationProps) {
  const [currentSceneId, setCurrentSceneId] = useState(scenario.scenes[0]?.id);
  const [visitedScenes, setVisitedScenes] = useState<string[]>([]);
  const [choicesMade, setChoicesMade] = useState<Array<{ sceneId: string; choiceId: string; points: number }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const currentScene = scenario.scenes.find(scene => scene.id === currentSceneId);
  const character = currentScene?.character ? 
    scenario.characters.find(char => char.id === currentScene.character) : null;

  const makeChoice = (choice: any) => {
    const newChoicesMade = [...choicesMade, {
      sceneId: currentSceneId!,
      choiceId: choice.id,
      points: choice.points || 0
    }];
    setChoicesMade(newChoicesMade);

    if (!visitedScenes.includes(currentSceneId!)) {
      setVisitedScenes([...visitedScenes, currentSceneId!]);
    }

    if (choice.nextScene) {
      setCurrentSceneId(choice.nextScene);
    } else if (currentScene?.nextScene) {
      setCurrentSceneId(currentScene.nextScene);
    } else {
      // End of scenario
      finishScenario(newChoicesMade);
    }
  };

  const continueToNext = () => {
    if (!visitedScenes.includes(currentSceneId!)) {
      setVisitedScenes([...visitedScenes, currentSceneId!]);
    }

    if (currentScene?.nextScene) {
      setCurrentSceneId(currentScene.nextScene);
    } else {
      // End of scenario
      finishScenario(choicesMade);
    }
  };

  const finishScenario = (choices: Array<{ sceneId: string; choiceId: string; points: number }>) => {
    const score = choices.reduce((sum, choice) => sum + choice.points, 0);
    const maxPossibleScore = scenario.scenes
      .filter(scene => scene.choices)
      .reduce((sum, scene) => {
        const maxChoicePoints = Math.max(...(scene.choices?.map(c => c.points || 0) || [0]));
        return sum + maxChoicePoints;
      }, 0);

    const percentage = maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
    const scenePath = visitedScenes.concat([currentSceneId!]);
    
    let feedback = '';
    if (percentage >= scenario.passingScore) {
      feedback = `Excellent decision-making! You navigated the scenario successfully with ${percentage}% effectiveness.`;
    } else {
      feedback = `Good effort! You scored ${percentage}%. Review the scenario to improve your decision-making skills.`;
    }

    setTotalScore(percentage);
    setShowResults(true);
    onComplete({ score: percentage, path: scenePath, feedback });
  };

  const resetScenario = () => {
    setCurrentSceneId(scenario.scenes[0]?.id);
    setVisitedScenes([]);
    setChoicesMade([]);
    setShowResults(false);
    setTotalScore(0);
  };

  const getProgressPercentage = () => {
    const totalScenes = scenario.scenes.length;
    const currentIndex = scenario.scenes.findIndex(scene => scene.id === currentSceneId);
    return totalScenes > 0 ? Math.round(((currentIndex + 1) / totalScenes) * 100) : 0;
  };

  const renderResults = () => {
    const passed = totalScore >= scenario.passingScore;
    
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <Card className={`${passed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                passed ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {passed ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                )}
              </div>
              <h3 className="text-xl font-bold mb-2">
                {passed ? 'Scenario Completed Successfully!' : 'Scenario Completed'}
              </h3>
              <p className="text-gray-600 mb-4">
                Final Score: {totalScore}% (Required: {scenario.passingScore}%)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Decision Review */}
        <Card>
          <CardHeader>
            <CardTitle>Your Decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {choicesMade.map((choice, index) => {
              const scene = scenario.scenes.find(s => s.id === choice.sceneId);
              const choiceData = scene?.choices?.find(c => c.id === choice.choiceId);
              
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{scene?.title}</h4>
                    <Badge variant={choice.points > 0 ? "default" : "secondary"}>
                      {choice.points} points
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Your choice:</strong> {choiceData?.text}
                  </p>
                  {choiceData?.feedback && (
                    <p className="text-sm text-blue-600">
                      <strong>Feedback:</strong> {choiceData.feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={resetScenario} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  };

  if (showResults) {
    return (
      <Card>
        <CardContent className="pt-6">
          {renderResults()}
        </CardContent>
      </Card>
    );
  }

  if (!currentScene) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Scenario Error</h3>
          <p className="text-gray-600">Unable to load scenario content.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{scenario.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
            </div>
            <Badge variant="outline">Simulation</Badge>
          </div>
          
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>Progress</span>
              <span>{getProgressPercentage()}% Complete</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Context (shown only on first scene) */}
        {currentSceneId === scenario.scenes[0]?.id && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <h4 className="font-medium text-blue-900 mb-2">Scenario Context</h4>
              <p className="text-blue-800 text-sm">{scenario.context}</p>
            </CardContent>
          </Card>
        )}

        {/* Current Scene */}
        <div className="space-y-4">
          {/* Character Info */}
          {character && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{character.name}</p>
                <p className="text-xs text-gray-600">{character.role}</p>
              </div>
            </div>
          )}

          {/* Scene Content */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <h3 className="font-medium mb-3">{currentScene.title}</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">{currentScene.content}</p>
              </div>
            </CardContent>
          </Card>

          {/* Choices or Continue */}
          {currentScene.type === 'choice' && currentScene.choices ? (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                What do you do?
              </h4>
              <div className="space-y-2">
                {currentScene.choices.map((choice, index) => (
                  <Button
                    key={choice.id}
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => makeChoice(choice)}
                  >
                    <div>
                      <span className="font-medium">
                        {String.fromCharCode(65 + index)}. {choice.text}
                      </span>
                      {choice.consequence && (
                        <p className="text-xs text-gray-500 mt-1">
                          {choice.consequence}
                        </p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Button onClick={continueToNext}>
                {currentScene.isEndScene ? 'Complete Scenario' : 'Continue'}
              </Button>
            </div>
          )}
        </div>

        {/* Score Display */}
        {choicesMade.length > 0 && (
          <div className="text-center text-sm text-gray-600">
            Current Score: {choicesMade.reduce((sum, choice) => sum + choice.points, 0)} points
          </div>
        )}
      </CardContent>
    </Card>
  );
} 