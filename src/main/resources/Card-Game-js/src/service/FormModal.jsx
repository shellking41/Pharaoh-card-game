import React, { useState, useEffect, useContext, useRef } from 'react';
import styles from './styles/FormModal.module.css';
import { ErrorContext } from '../Contexts/ErrorContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function FormModal({
  inputs = [],
  header = { text: 'Header', tag: 'h1' },
  onSubmit = () => {},
  buttonText,
  children,
}) {
  const navigate = useNavigate();
  const { errorLog, setErrorLog } = useContext(ErrorContext);
  const [formData, setFormData] = useState(
    Object.fromEntries(inputs.map(input => [input.name, ''])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [inputError, setInputError] = useState(Array(inputs.length).fill(false));
  const [touchedInputs, setTouchedInputs] = useState(Array(inputs.length).fill(false));
  const [focusedInputs, setFocusedInputs] = useState(Array(inputs.length).fill(false));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!errorLog || errorLog.message === null || errorLog.message === undefined) {
      setErrorLog({ error: false, message: '' });
    }
  }, [errorLog]);

  // Autofill detektálás
  useEffect(() => {
    const checkAutofill = () => {
      inputRefs.current.forEach((input, index) => {
        if (input && input.matches(':-webkit-autofill')) {
          setTouchedInputs(prev => {
            const newTouched = [...prev];
            newTouched[index] = true;
            return newTouched;
          });

          const value = input.value;
          if (value) {
            setFormData(prev => ({
              ...prev,
              [input.name]: value,
            }));

            const minLength = inputs[index].minLength;
            const isValid = value.length >= minLength;

            setInputError(prev => {
              const newErrors = [...prev];
              newErrors[index] = !isValid;
              return newErrors;
            });
          }
        }
      });
    };

    const timer = setTimeout(checkAutofill, 100);
    const timer2 = setTimeout(checkAutofill, 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [inputs]);

  // firissitse az inputerrorokat ha van error
  useEffect(() => {
    if (!errorLog || !errorLog.message) {
      return;
    }

    setInputError(prev => {
      const newErrors = [...prev];
      inputs.forEach((input, index) => {
        if (input.errorWhen) {
          newErrors[index] = true;
        }
      });
      return newErrors;
    });
  }, [errorLog, inputs]);
  useEffect(() => {
    console.log(errorLog);

    setErrorLog({ error: false, message: '' });

  }, []);

  const handleChange = (minLength, index, e, name) => {
    setErrorLog({ error: false, message: '' });

    const value = e.target.value;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    setSubmitted(false);

    setTouchedInputs(prev => {
      const newTouched = [...prev];
      newTouched[index] = true;
      return newTouched;
    });

    const isTooShort = value.length < minLength;
    const isEmpty = value === '' || value == null;

    const newErrors = [...inputError];
    newErrors[index] = isTooShort || isEmpty;

    setInputError(newErrors);

    const invalidFields = [];

    newErrors.forEach((hasError, idx) => {
      if (hasError) {
        invalidFields.push(inputs[idx].name);
      }
    });

    let errorMessage = '';
    if (invalidFields.length === 1) {
      errorMessage = `${invalidFields[0]} is too short or empty.`;
    } else if (invalidFields.length > 1) {
      const last = invalidFields.pop();
      errorMessage = `${invalidFields.join(', ')} and ${last} are too short or empty.`;
    }

    setErrorLog({
      error: invalidFields.length > 0,
      message: errorMessage,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (inputError.includes(true) || touchedInputs.includes(false)) {
      return;
    }

    onSubmit(formData);
  };

  const displayMessage = errorLog?.message || '';

  return (
    <div className={styles.modal}>
      <div className={styles.formWrapper}>
        <form onSubmit={handleSubmit}>
          <div className={styles.inputSection}>
            <div className={styles.headerWrapper}>
              <h1 className={styles.header}>
                {header.text}
              </h1>
            </div>

            {inputs.map((input, index) => (
              <label
                key={input.name}
                className={`${styles.inputWrapper} ${
                  inputError[index] &&
                  !focusedInputs[index] &&
                  (touchedInputs[index] || submitted)
                    ? styles.inputError
                    : ''
                }`}
                htmlFor={input.name}
              >
                <label className={styles.inputLabel} htmlFor={input.name}>
                  {input.name}
                </label>
                <input
                  ref={el => inputRefs.current[index] = el}
                  className={styles.input}
                  type={input.type}
                  id={input.name}
                  name={input.name}
                  placeholder=""
                  value={formData[input.name] || ''}
                  onChange={(e) =>
                    handleChange(input.minLength, index, e, input.name)
                  }
                  onFocus={() => {
                    setFocusedInputs(prev => {
                      const newFocus = [...prev];
                      newFocus[index] = true;
                      return newFocus;
                    });
                  }}
                  onBlur={() => {
                    setFocusedInputs(prev => {
                      const newFocus = [...prev];
                      newFocus[index] = false;
                      return newFocus;
                    });
                  }}
                  autoComplete="off"
                  maxLength="50"
                />
              </label>
            ))}
          </div>

          <div className={styles.submitButtonWrapper}>
            <button
              disabled={(inputError.includes(true) || touchedInputs.includes(false))}
              className={styles.submitButton}
              type="submit"
            >
              {buttonText}
            </button>
            {errorLog?.error && displayMessage && (
              <div style={{ color: 'red' }}>{displayMessage}</div>
            )}
          </div>
        </form>
        {children}
      </div>
    </div>
  );
}