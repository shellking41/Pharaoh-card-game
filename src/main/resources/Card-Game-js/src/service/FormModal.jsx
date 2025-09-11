import React, {useState, useEffect, useContext} from 'react';

import styles from './styles/FormModal.module.css';
import {ErrorContext} from "../Contexts/ErrorContext.jsx";

export default function FormModal({
                                      inputs = [],
                                      header = {text: 'Header', tag: 'h1'},
                                      onSubmit = () => {
                                      },
                                      children
                                  }
) {
    const {errorLog, setErrorLog} = useContext(ErrorContext);
    const [formData, setFormData] = useState(
        Object.fromEntries(inputs.map(input => [input.name, '']))
    );
    const [submitted, setSubmitted] = useState(false);
    const [inputError, setInputError] = useState(Array(inputs.length).fill(false));
    const [touchedInputs, setTouchedInputs] = useState(Array(inputs.length).fill(false));
    const [focusedInputs, setFocusedInputs] = useState(Array(inputs.length).fill(false));

    // Update formData when inputs prop changes
    // useEffect(() => {
    //     setFormData(Object.fromEntries(inputs.map(input => [input.name, ''])));
    //     setInputError(Array(inputs.length).fill(false));
    //     setTouchedInputs(Array(inputs.length).fill(false));
    // }, [inputs]);
    // Update input errors when errorLog changes (for errorWhen conditions)
    useEffect(() => {
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


    const handleChange = (minLength, index, e, name) => {
        setErrorLog((prev) => ({...prev, error: false, message: ""}))
        const value = e.target.value;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        setSubmitted(false);

        setTouchedInputs(prev => {
            const newTouched = [...prev];
            newTouched[index] = true;
            return newTouched;
        });

        const isTooShort = value.length < minLength;
        const isEmpty = value === '' || value == null;

        console.log(isTooShort, value.length, minLength)


        setInputError(prev => {
            const newErrors = [...prev];
            newErrors[index] = isTooShort || isEmpty;
            return newErrors;
        });

        const invalidFields = [];

        inputError.forEach((hasError, index) => {
            if (hasError) {
                invalidFields.push(inputs[index].name);
            }
        });

        let errorMessage = '';
        if (invalidFields.length === 1) {
            errorMessage = `${invalidFields[0]} is too short or empty.`;
        } else if (invalidFields.length > 1) {
            const last = invalidFields.pop();
            errorMessage = `${invalidFields.join(', ')} and ${last} are too short or empty.`;
        }

        setErrorLog((prev) => ({...prev, error: true, message: errorMessage}));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        console.log(touchedInputs, inputError)
        if (inputError.includes(true) || touchedInputs.includes(false)) {

            return;
        }


        onSubmit(formData);
    };

    const HeaderComponent = header.tag;

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
                                    !focusedInputs[index] && // csak ha nincs fókuszban
                                    (touchedInputs[index] || submitted) // és már hozzáért vagy elküldte
                                        ? styles.inputError
                                        : ''
                                }`}
                                htmlFor={input.name}
                            >
                                <label className={styles.inputLabel} htmlFor={input.name}>
                                    {input.name}
                                </label>
                                <input
                                    className={styles.input}
                                    type={input.type}
                                    id={input.name}
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
                                        console.log("focus")

                                    }}
                                    onBlur={() => {
                                        setFocusedInputs(prev => {
                                            const newFocus = [...prev];
                                            newFocus[index] = false;
                                            return newFocus;
                                        });
                                        console.log("blur")
                                    }}
                                    autoComplete="off"
                                    maxLength="50"
                                />
                            </label>
                        ))}
                    </div>

                    <div className={styles.submitButtonWrapper}>
                        <button className={styles.submitButton} type="submit">
                            submit
                        </button>
                    </div>
                    {errorLog.error &&
                        <div style={{color: "red"}}>{errorLog.message}</div>}
                </form>
                {children}
            </div>
        </div>
    );

};

;