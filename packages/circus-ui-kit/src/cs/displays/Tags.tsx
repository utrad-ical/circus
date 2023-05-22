import React, { useEffect, useMemo, useState } from 'react';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import Dropdown from 'react-bootstrap/lib/Dropdown';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import styled from 'styled-components';
import { Button } from '../../ui/Button';
import Tooltip from '../../ui/Tooltip';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { useErrorMessage } from './utils/useErrorMessage';

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
    initialValue = []
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
      p.data.forEach(selectedTag => {
        const updatedDetails = voteDetails.get(selectedTag) ?? [];
        updatedDetails.push(p.userEmail);
        return voteDetails.set(selectedTag, updatedDetails);
      });
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
    <StyledFormGroup validationState={invalidMessage ? 'error' : undefined}>
      {label && <ControlLabel>{label}</ControlLabel>}
      <div className="array">
        {tags.map((tag, index) =>
          (personalVoteDetails?.get(tag) ?? []).length > 0 ? (
            <Tooltip text={tooltipText(tag)} key={tag}>
              <div key={index} className="array-item">
                <FormControl type="text" value={tag} readOnly />
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleTagRemove(index)}
                  disabled={!editable}
                >
                  &times;
                </button>
              </div>
            </Tooltip>
          ) : (
            <div key={index} className="array-item">
              <FormControl type="text" value={tag} readOnly />
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleTagRemove(index)}
                disabled={!editable}
              >
                &times;
              </button>
            </div>
          )
        )}
      </div>
      <div className="chooseTags">
        {predefinedTags.length > 0 && (
          <Dropdown
            id="chooseTagsFromPreset"
            className="fromPreset"
            onSelect={handleTagSelect as any}
            disabled={!editable}
          >
            <Dropdown.Toggle>Choose Tag from preset</Dropdown.Toggle>
            <Dropdown.Menu>
              {predefinedTags.map(tag => (
                <MenuItem key={tag} eventKey={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        )}
        {acceptFreeText && (
          <div className="fromFreeText">
            <label>Tag from free text </label>
            <FormControl
              type="text"
              disabled={!editable}
              value={freeText}
              onChange={handleFreeTextChange as any}
            />
            <Button onClick={() => handleAddFreeText()} disabled={!editable}>
              Add
            </Button>
            <div className="warningMessage">{warningMessage ?? ''}</div>
          </div>
        )}
      </div>
    </StyledFormGroup>
  );
};

const StyledFormGroup = styled(FormGroup)`
  .array {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    .array-item {
      min-width: 10em;
      display: flex;
    }
  }
  .chooseTags {
    display: flex;
    margin-top: 1rem;
  }
  .fromFreeText {
    display: grid;
    align-items: center;
    grid-template-columns: auto 1fr auto auto;
    margin-left: 1rem;

    .warningMessage {
      color: red;
      margin-left: 1rem;
    }
    label {
      margin-right: 0.5rem;
    }
  }
`;
