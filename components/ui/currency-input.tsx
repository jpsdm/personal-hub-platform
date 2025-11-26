"use client";

import { Input } from "@/components/ui/input";
import { forwardRef, useEffect, useState } from "react";

interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
  value?: number;
  onValueChange?: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [centavos, setCentavos] = useState<number>(0);
    const [isNegative, setIsNegative] = useState<boolean>(false);

    useEffect(() => {
      if (value !== undefined && value !== null) {
        const isNeg = value < 0;
        setIsNegative(isNeg);
        setCentavos(Math.abs(Math.round(value * 100)));
      }
    }, [value]);

    const formatCurrency = (cents: number, negative: boolean): string => {
      const reais = cents / 100;
      const formatted = reais.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return negative ? `-${formatted}` : formatted;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite trocar o sinal com "-"
      if (e.key === "-") {
        e.preventDefault();
        const newIsNegative = !isNegative;
        setIsNegative(newIsNegative);
        if (onValueChange) {
          const finalValue = centavos / 100;
          onValueChange(newIsNegative ? -finalValue : finalValue);
        }
        return;
      }

      // Permite backspace, delete, tab, escape, enter
      if (
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.key === "Tab" ||
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        if (e.key === "Backspace") {
          e.preventDefault();
          const newCents = Math.floor(centavos / 10);
          setCentavos(newCents);
          // Se zerou, remover o sinal negativo também
          if (newCents === 0) {
            setIsNegative(false);
            if (onValueChange) {
              onValueChange(0);
            }
          } else if (onValueChange) {
            onValueChange(isNegative ? -(newCents / 100) : newCents / 100);
          }
        } else if (e.key === "Delete") {
          e.preventDefault();
          setCentavos(0);
          setIsNegative(false);
          if (onValueChange) {
            onValueChange(0);
          }
        }
        return;
      }

      // Permite apenas números
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      const digit = parseInt(e.key);
      const newCents = centavos * 10 + digit;

      // Limita a 999999999.99 (9 dígitos antes da vírgula)
      if (newCents > 99999999999) {
        return;
      }

      setCentavos(newCents);
      if (onValueChange) {
        onValueChange(isNegative ? -(newCents / 100) : newCents / 100);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Seleciona todo o texto ao focar
      e.target.select();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");

      // Verifica se é negativo
      const isNeg = pastedText.trim().startsWith("-");

      // Remove tudo exceto números, vírgula e ponto
      let cleaned = pastedText.replace(/[^\d.,]/g, "");

      // Substitui vírgula por ponto
      cleaned = cleaned.replace(",", ".");

      const numValue = parseFloat(cleaned);
      if (!isNaN(numValue) && numValue >= 0) {
        const newCents = Math.round(numValue * 100);
        if (newCents <= 99999999999) {
          setCentavos(newCents);
          setIsNegative(isNeg);
          if (onValueChange) {
            onValueChange(isNeg ? -(newCents / 100) : newCents / 100);
          }
        }
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          R$
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={formatCurrency(centavos, isNegative)}
          onChange={() => {}} // Controlled by onKeyDown
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onPaste={handlePaste}
          placeholder="0,00"
          className={`pl-10 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
