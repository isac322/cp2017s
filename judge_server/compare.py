#!/usr/bin/env python3
# coding: UTF-8

import json
import sys


def compare(output_path: str, answer_path: str, index: int) -> dict:
    with open(output_path, encoding='utf-8') as fp, open(answer_path, encoding='utf-8') as answer:
        whole_user_output = fp.read()

        user_output = tuple(map(str.rstrip, whole_user_output.rstrip().split('\n')))
        answer_output = tuple(map(str.rstrip, answer.read().rstrip().split('\n')))

        if len(user_output) != len(answer_output):
            return {'isMatched': False, 'unmatchedOutput': whole_user_output, 'unmatchedIndex': index}

        for user_line, ans_line in zip(user_output, answer_output):
            if user_line != ans_line:
                return {'isMatched': False, 'unmatchedOutput': whole_user_output, 'unmatchedIndex': index}

    return {'isMatched': True}


def main():
    output = sys.argv[1]
    answer = sys.argv[2]
    data_index = int(sys.argv[3])
    return_code = int(sys.argv[4])
    error_log = sys.argv[5]

    if return_code is 0:
        result = compare(output, answer, data_index)

        with open(error_log, encoding='UTF-8') as fp:
            log = fp.read()

            if len(log) == 0:
                log = None

            result['errorLog'] = log

    else:
        with open(error_log, encoding='UTF-8') as fp:
            log = fp.readlines()
            if len(log) > 0:
                log = log[:-1]

            log = str.join('', log)

            if len(log) == 0:
                log = None

            result = {'isMatched': False, 'returnCode': return_code, 'errorLog': log}

    with open('output/result.json', 'w', encoding='UTF-8') as fp:
        fp.write(json.dumps(result, ensure_ascii=False))

    if result['isMatched']:
        return 0
    else:
        return 1


if __name__ == '__main__':
    exit(main())
