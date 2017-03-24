#!/usr/bin/env python3

import sys
import json
from os.path import join


def compare(output_path: str, answer_path: str, result: dict) -> bool:
    with open(output_path, encoding='utf-8') as fp, open(answer_path, encoding='utf-8') as answer:
        whole_user_output = fp.read()

        user_output = tuple(map(str.rstrip, whole_user_output.rstrip().split('\n')))
        answer_output = tuple(map(str.rstrip, answer.read().rstrip().split('\n')))

        if len(user_output) != len(answer_output):
            result['isMatched'] = False
            result['unmatchedOutput'] = whole_user_output
            return False

        for user_line, ans_line in zip(user_output, answer_output):
            if user_line != ans_line:
                result['isMatched'] = False
                result['unmatchedOutput'] = whole_user_output
                return False

    return True


def main():
    outputs = sys.argv[1]
    answers = sys.argv[2]
    output_num = int(sys.argv[3])

    result = {'isMatched': True, 'unmatchedIndex': None, 'unmatchedOutput': None}

    for i in range(output_num):
        file_name = '{}.out'.format(i + 1)

        if not compare(join(outputs, file_name), join(answers, file_name), result):
            result['unmatchedIndex'] = i + 1
            break

    with open('output/result.json', 'w', encoding='UTF-8') as fp:
        fp.write(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
