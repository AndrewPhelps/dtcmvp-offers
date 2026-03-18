'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { Button, Card, Badge } from '@/components/common';
import { Navbar } from '@/components/layout';
import { questions, offers, partners, categories, getCategory, getTagsByIds } from '@/data';
import { Offer } from '@/types';

type Answers = Record<string, string[]>;

export default function QuestionnairePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleSelect = (optionId: string) => {
    const questionId = currentQuestion.id;

    if (currentQuestion.type === 'single') {
      setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
    } else {
      const current = answers[questionId] || [];
      if (current.includes(optionId)) {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: current.filter((id) => id !== optionId),
        }));
      } else {
        // Limit to 3 for priorities question
        if (questionId === 'priorities' && current.length >= 3) return;
        setAnswers((prev) => ({
          ...prev,
          [questionId]: [...current, optionId],
        }));
      }
    }
  };

  const isSelected = (optionId: string) => {
    return (answers[currentQuestion.id] || []).includes(optionId);
  };

  const canProceed = (answers[currentQuestion.id] || []).length > 0;

  const handleNext = () => {
    if (isLastQuestion) {
      setShowResults(true);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Calculate recommended offers based on answers
  const recommendedOffers = useMemo(() => {
    if (!showResults) return [];

    // Collect all tags from selected answers
    const selectedTags: string[] = [];
    Object.entries(answers).forEach(([questionId, selectedOptions]) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      selectedOptions.forEach((optionId) => {
        const option = question.options.find((o) => o.id === optionId);
        if (option) {
          selectedTags.push(...option.tags);
        }
      });
    });

    // Score each offer based on tag matches
    const scoredOffers = offers
      .filter((o) => o.isActive)
      .map((offer) => {
        let score = 0;

        // Check category match
        const category = getCategory(offer.categoryId);
        if (category && selectedTags.includes(category.name)) {
          score += 3;
        }

        // Check tag matches
        const offerTags = getTagsByIds(offer.tagIds);
        offerTags.forEach((tag) => {
          if (selectedTags.some((t) => t.toLowerCase() === tag.name.toLowerCase())) {
            score += 1;
          }
        });

        return { offer, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.offer);

    return scoredOffers.length > 0 ? scoredOffers : offers.filter((o) => o.isActive).slice(0, 6);
  }, [showResults, answers]);

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find((p) => p.id === partnerId);
    return partner?.name || partnerId;
  };

  if (showResults) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Results header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-green-primary)]/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-[var(--brand-green-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Your Recommended Offers
            </h1>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Based on your answers, we think these offers would be most valuable for your brand.
            </p>
          </div>

          {/* Recommended offers */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {recommendedOffers.map((offer) => {
              const category = getCategory(offer.categoryId);
              return (
                <Link key={offer.id} href={`/offers/${offer.id}`}>
                  <Card className="h-full hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="default" className="text-xs">
                        {category?.name || offer.categoryId}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                      {offer.name}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      {offer.shortDescription}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      by {getPartnerName(offer.partnerId)}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4">
            <Link href="/offers">
              <Button variant="secondary">
                Browse All Offers
              </Button>
            </Link>
            <Button onClick={() => {
              setShowResults(false);
              setCurrentStep(0);
              setAnswers({});
            }}>
              Start Over
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">
              Question {currentStep + 1} of {questions.length}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand-green-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <Card className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {currentQuestion.question}
          </h1>
          {currentQuestion.description && (
            <p className="text-[var(--text-secondary)] mb-6">
              {currentQuestion.description}
            </p>
          )}

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const selected = isSelected(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selected
                      ? 'border-[var(--brand-green-primary)] bg-[var(--brand-green-primary)]/10'
                      : 'border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-body)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected
                          ? 'border-[var(--brand-green-primary)] bg-[var(--brand-green-primary)]'
                          : 'border-[var(--border-default)]'
                      }`}
                    >
                      {selected && (
                        <CheckCircle className="w-3 h-3 text-[var(--bg-body)]" />
                      )}
                    </div>
                    <span
                      className={`font-medium ${
                        selected
                          ? 'text-[var(--brand-green-primary)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button onClick={handleNext} disabled={!canProceed}>
            {isLastQuestion ? 'See Results' : 'Next'}
            {!isLastQuestion && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {/* Skip link */}
        <div className="text-center mt-6">
          <Link
            href="/offers"
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Skip and browse all offers
          </Link>
        </div>
      </div>
    </div>
  );
}
