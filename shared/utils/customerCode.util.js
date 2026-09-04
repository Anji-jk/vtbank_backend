import db from '../db/models/index.js';

export const generateCustomerCode = async (transaction) => {
    const currentYear = new Date().getFullYear();
    const BANK_CODE = '0123';
    // console.log("transaction:" , transaction);

    // `lock: transaction.LOCK.UPDATE` issues a SELECT ... FOR UPDATE —
    // this locks the row for the current year until the transaction
    // commits or rolls back. If a second registration happens at the
    // exact same moment, it will simply WAIT for this one to finish,
    // instead of both reading the same last_number and colliding.
    let sequence = await db.CustomerIdSequence.findOne({
        where: { year: currentYear },
        lock: transaction.LOCK.UPDATE,
        transaction,
    });

    if (!sequence) {
        // First customer of this year — create the counter row.
        sequence = await db.CustomerIdSequence.create(
            { year: currentYear, lastNumber: 0 },
            { transaction }
        );
    }

    const nextNumber = sequence.lastNumber + 1;
    await sequence.update({ lastNumber: nextNumber }, { transaction });

    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${BANK_CODE}${currentYear}${paddedNumber}`; // e.g. "00012026"

}

