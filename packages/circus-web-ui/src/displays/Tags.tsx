import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import Button from '#components/Button.tsx';
import Tooltip from '#components/Tooltip.tsx';
import { useCsResults } from '@utrad-ical/circus-ui-kit';
import type { Display } from '@utrad-ical/circus-ui-kit';
import {
  Field,
  FieldLabel,
  SelectInput,
  TextInput
} from './utils/formField.tsx';
import { useErrorMessage } from './utils/useErrorMessage.tsx';
import styles from './Tags.module.css';

interface TagsOptions {
  label?: string;
  predefinedTags?: string[];
  acceptFreeText?: boolean;
  /**
   * RegExp string that can be passed to `new RegExp()` to validate free text.
   */
  freeTextPattern?: string;
  minItems?: number;
  maxItems?: number;
  initialValue?: string[];
  freeTextLabel?: string;
}

const isArrayOfStrings = (arr: unknown): arr is string[] => {
  return Array.isArray(arr) && arr.every(item => typeof item === 'string');
};

const checkTagOptions = (options: TagsOptions) => {
  const {
    predefinedTags,
    acceptFreeText,
    freeTextPattern,
    minItems,
    maxItems,
    initialValue
  } = options;
  const errors: string[] = [];

  if (!isArrayOfStrings(predefinedTags))
    errors.push('Predefined tags must be an array of strings.');
  if (acceptFreeText !== undefined && typeof acceptFreeText !== 'boolean')
    errors.push('The value of "acceptFreeText" must be a boolean.');
  if (!acceptFreeText && !predefinedTags?.length) {
    errors.push('If "acceptFreeText" is false, "predefinedTags" must be set.');
  }
  if (freeTextPattern !== undefined && typeof freeTextPattern !== 'string')
    errors.push('The value of "freeTextPattern" must be a string.');

  if (minItems !== undefined && typeof minItems !== 'number')
    errors.push('The value of "minItems" must be a number.');
  if (maxItems !== undefined && typeof maxItems !== 'number')
    errors.push('The value of "maxItems" must be a number.');

  if (initialValue !== undefined && !isArrayOfStrings(initialValue))
    errors.push('Initial value must be an array of strings.');

  return errors;
};

/**
 * Tag display collect user feedback as an array of string tags.
 */
export const Tags: Display<TagsOptions, string[]> = props => {
  const { options, initialFeedbackValue, onFeedbackChange, personalOpinions } =
    props;
  const {
    label,
    predefinedTags = [],
    acceptFreeText = false,
    freeTextPattern = '.*',
    minItems = 0,
    maxItems = 10,
    initialValue = [],
    freeTextLabel = undefined
  } = options ?? {};
  const { consensual, editable, UserDisplay } = useCsResults();

  const [tags, setTags] = useState<string[]>(() => {
    if (initialFeedbackValue) return initialFeedbackValue;
    if (consensual && editable) {
      const all = personalOpinions.reduce(
        (acc, cur) => acc.concat(cur.data),
        [] as string[]
      );
      const unique = Array.from(new Set(all));
      return unique;
    }
    return initialValue ?? [];
  });

  const [freeText, setFreeText] = useState('');
  const [invalidMessage, setInvalidMessage] = useState<string | undefined>();
  const [error, setError] = useErrorMessage();
  const [warningMessage, setWarningMessage] = useState<string | undefined>();

  const personalVoteDetails = useMemo(() => {
    const voteDetails = new Map<string, string[]>();
    if (!consensual) return voteDetails;
    personalOpinions.forEach(p => {
      if (Array.isArray(p.data)) {
        p.data.forEach(selectedTag => {
          const updatedDetails = voteDetails.get(selectedTag) ?? [];
          updatedDetails.push(p.userEmail);
          voteDetails.set(selectedTag, updatedDetails);
        });
      }
    });
    return voteDetails;
  }, [personalOpinions]);

  const tooltipText = (tag: string) => {
    const emails = personalVoteDetails?.get(tag);
    return emails && emails.length > 0
      ? emails.map((email, index) => (
          <React.Fragment key={email}>
            <UserDisplay userEmail={email} />
            {index < emails.length - 1 && (
              <>
                ,<br />
              </>
            )}
          </React.Fragment>
        ))
      : '';
  };

  const isTagExist = (tag: string, tags: string[]) => {
    return tags.some(t => t === tag);
  };

  const handleFreeTextChange = (ev: React.ChangeEvent<HTMLInputElement>) =>
    setFreeText(ev.target.value);

  const handleAddFreeText = () => {
    if (tags.length >= maxItems) {
      setWarningMessage('Reached max items.');
      return;
    }
    if (isTagExist(freeText, tags)) {
      setWarningMessage(`"${freeText}" already exist.`);
      return;
    }
    if (freeText.length <= 0) {
      setWarningMessage('Empty text.');
      return;
    }
    const re = new RegExp(freeTextPattern);
    if (!re.test(freeText)) {
      setWarningMessage(
        `Invalid text. Free text must match the following pattern: ${freeTextPattern}`
      );
      return;
    }

    setTags([...tags, freeText]);
    setFreeText('');
    setWarningMessage(undefined);
  };

  const handleTagSelect = (tag: string) => {
    if (tags.length >= maxItems) {
      setWarningMessage('Reached max items.');
      return;
    }
    if (isTagExist(tag, tags)) {
      setWarningMessage(`"${tag}" already exist.`);
      return;
    }
    setTags([...tags, tag]);
    setWarningMessage(undefined);
  };

  const handleTagRemove = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
    setWarningMessage(undefined);
  };

  useEffect(() => {
    if (error) {
      onFeedbackChange({ valid: false, error: 'Options error.' });
      return;
    }

    const errors = checkTagOptions({
      label,
      predefinedTags,
      acceptFreeText,
      freeTextPattern,
      minItems,
      maxItems,
      initialValue
    });
    if (errors.length > 0) setError(errors.join(' '));

    const invalidate = (message: string) => {
      setInvalidMessage(message);
    };
    if (tags.some(tag => !acceptFreeText && !predefinedTags?.includes(tag))) {
      invalidate('Invalid tags.');
      return;
    }
    setInvalidMessage(undefined);

    if (tags.length < minItems) {
      setWarningMessage(
        `Please select at least ${minItems} item${minItems !== 1 ? 's' : ''}.`
      );
      return;
    } else if (tags.length > maxItems) {
      setWarningMessage(
        `Max number of items is ${maxItems}. Please deselect at least ${
          tags.length - maxItems
        } item${tags.length - maxItems !== 1 ? 's' : ''}.`
      );
      return;
    }
    setWarningMessage(undefined);
    onFeedbackChange({ valid: true, value: tags });
  }, [tags, error]);

  if (error) return error;

  return (
    <Field className={styles.field}>
      {label && <FieldLabel as="div">{label}</FieldLabel>}
      <div className={classNames('tags', styles.tags)}>
        <div className={classNames('array', styles.array)}>
          {tags.map((tag, index) =>
            (personalVoteDetails?.get(tag) ?? []).length > 0 ? (
              <Tooltip content={tooltipText(tag)} key={tag}>
                <div
                  key={index}
                  className={classNames('array-item', styles.arrayItem)}
                >
                  <div>{tag}</div>
                  {editable ? (
                    <a onClick={() => handleTagRemove(index)}>&times;</a>
                  ) : index !== tags.length - 1 ? (
                    <div className="separator">,</div>
                  ) : null}
                </div>
              </Tooltip>
            ) : (
              <div
                key={index}
                className={classNames('array-item', styles.arrayItem)}
              >
                <div>{tag}</div>
                {editable ? (
                  <a onClick={() => handleTagRemove(index)}>&times;</a>
                ) : index !== tags.length - 1 ? (
                  <div className="separator">,</div>
                ) : null}
              </div>
            )
          )}
        </div>
        <div className={classNames('chooseTags', styles.chooseTags)}>
          {predefinedTags.length > 0 && (
            <SelectInput
              className="fromPreset"
              aria-label="Add a tag"
              aria-invalid={!!invalidMessage}
              value=""
              onChange={(ev: React.ChangeEvent<HTMLSelectElement>) =>
                ev.target.value && handleTagSelect(ev.target.value)
              }
              disabled={!editable}
            >
              <option value="">Add...</option>
              {predefinedTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </SelectInput>
          )}
          {acceptFreeText && (
            <div className={classNames('fromFreeText', styles.fromFreeText)}>
              {freeTextLabel && <label>{freeTextLabel}</label>}
              <TextInput
                type="text"
                aria-label={freeTextLabel ?? 'Free text'}
                disabled={!editable}
                value={freeText}
                onChange={handleFreeTextChange}
              />
              <Button onClick={() => handleAddFreeText()} disabled={!editable}>
                Add
              </Button>
              <div
                className={classNames('warningMessage', styles.warningMessage)}
              >
                {warningMessage ?? ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </Field>
  );
};
