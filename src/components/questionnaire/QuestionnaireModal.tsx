'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Modal, Button } from '@/components/common';
import { questions, offers, categories, getTagsByIds } from '@/data';
import { Offer } from '@/types';

type Answers = Record<string, string[]>;

interface QuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (recommendedOffers: Offer[]) => void;
}

export default function QuestionnaireModal({ isOpen, onClose, onComplete }: QuestionnaireModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const isFirstQuestion = currentStep === 0;
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

  const calculateRecommendedOffers = (currentAnswers: Answers): Offer[] => {
    // Collect all tags from selected answers
    const selectedTags: string[] = [];
    Object.entries(currentAnswers).forEach(([questionId, selectedOptions]) => {
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

        // Check category match - find category by ID and check if name matches
        const category = categories.find((c) => c.id === offer.categoryId);
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
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Calculate recommendations and complete
      const recommendedOffers = calculateRecommendedOffers(answers);
      onComplete(recommendedOffers);
      handleReset();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Header content
  const headerContent = (
    <div className="flex items-center gap-3 md:gap-4">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--brand-green-primary)]/20 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-[var(--brand-green-primary)]" />
      </div>
      <div>
        <h2 className="text-base md:text-xl font-semibold text-[var(--text-primary)]">
          Let&apos;s find the offers best for you
        </h2>
        <p className="text-xs md:text-sm text-[var(--text-tertiary)]">
          Question {currentStep + 1} of {questions.length}
        </p>
      </div>
    </div>
  );

  // Footer content - navigation buttons
  const footerContent = (
    <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4">
      {isFirstQuestion ? (
        <button
          onClick={handleClose}
          className="text-xs md:text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
        >
          Skip and browse all
        </button>
      ) : (
        <Button
          variant="ghost"
          onClick={handleBack}
          size="sm"
          className="md:text-base"
        >
          <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
          Back
        </Button>
      )}

      <Button onClick={handleNext} disabled={!canProceed} size="sm" className="md:text-base">
        {isLastQuestion ? 'See Results' : 'Next'}
        {!isLastQuestion && <ArrowRight className="w-4 h-4 ml-1 md:ml-2" />}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={headerContent}
      footer={footerContent}
      progress={progress}
      contentHeight="570px"
    >
      <div className="p-4 md:p-8">
        {/* Question */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-xl font-semibold text-[var(--text-primary)] mb-1 md:mb-2">
            {currentQuestion.question}
          </h3>
          {currentQuestion.description && (
            <p className="text-sm md:text-base text-[var(--text-secondary)]">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Options - merged with shared borders */}
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          {currentQuestion.options.map((option, index) => {
            const selected = isSelected(option.id);
            const isLast = index === currentQuestion.options.length - 1;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`w-full text-left p-3 md:p-4 transition-all cursor-pointer min-h-[48px] ${
                  selected
                    ? 'bg-[var(--brand-green-primary)]/10'
                    : 'bg-[var(--bg-body)] hover:bg-[var(--bg-card-hover)]'
                } ${!isLast ? 'border-b border-[var(--border-default)]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      selected
                        ? 'border-[var(--brand-green-primary)] bg-[var(--brand-green-primary)]'
                        : 'border-[var(--border-default)]'
                    }`}
                  >
                    {selected && (
                      <Check className="w-3 h-3 text-[var(--bg-body)]" strokeWidth={3} />
                    )}
                  </div>
                  <span
                    className={`text-sm md:text-base font-medium ${
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
      </div>
    </Modal>
  );
}
